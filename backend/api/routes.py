import asyncio
import json
import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents.decomposer import decompose_device
from ..agents.researcher import enrich_bom
from ..agents.writer import generate_guide
from ..providers.factory import get_provider

router = APIRouter()

# Timeout для всего pipeline (секунды)
PIPELINE_TIMEOUT = int(os.getenv("PIPELINE_TIMEOUT", "180"))


class BuildRequest(BaseModel):
    description: str
    budget: str = "любой"
    skill_level: str = "beginner"
    country: str = "global"
    # Конфиг модели — приходит из UI настроек
    provider: str = ""
    api_key: str = ""
    model: str = ""
    base_url: str = ""


class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str = ""
    model: str = ""
    base_url: str = ""


class BuildResponse(BaseModel):
    decomposition: dict
    guide: dict


def _sse_event(event: str, data: dict) -> str:
    """Формирует SSE-сообщение."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/build/stream")
async def build_stream(req: BuildRequest):
    """SSE streaming endpoint — отдаёт прогресс по этапам."""
    config = {
        "provider": req.provider or os.getenv("PROVIDER", ""),
        "api_key": req.api_key or os.getenv("API_KEY", ""),
        "model": req.model or os.getenv("MODEL", ""),
        "base_url": req.base_url or os.getenv("BASE_URL", ""),
    }

    if not config["provider"]:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_provider", "detail": "Провайдер не выбран"},
        )

    try:
        provider = get_provider(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "unknown_provider", "detail": str(e)})

    async def event_generator():
        try:
            async with asyncio.timeout(PIPELINE_TIMEOUT):
                # Шаг 1: декомпозиция
                yield _sse_event("phase", {"phase": "decomposing", "message": "Анализирую устройство..."})
                decomposition = await decompose_device(
                    provider, req.description,
                    budget=req.budget, skill_level=req.skill_level, country=req.country,
                )
                yield _sse_event("decomposition", decomposition)

                # Шаг 2: поиск компонентов
                yield _sse_event("phase", {"phase": "researching", "message": "Ищу компоненты и цены..."})
                decomposition = await enrich_bom(provider, decomposition, country=req.country)
                yield _sse_event("enriched", decomposition)

                # Шаг 3: генерация инструкции
                yield _sse_event("phase", {"phase": "writing", "message": "Пишу инструкцию сборки..."})
                guide = await generate_guide(provider, decomposition, skill_level=req.skill_level)
                yield _sse_event("guide", guide)

                # Финал
                yield _sse_event("done", {"decomposition": decomposition, "guide": guide})

        except TimeoutError:
            yield _sse_event("error", {"error": "pipeline_timeout", "detail": f"Pipeline не завершился за {PIPELINE_TIMEOUT} секунд"})
        except ValueError as e:
            yield _sse_event("error", {"error": "llm_parse_error", "detail": str(e)})
        except Exception as e:
            error_msg = str(e).lower()
            if "auth" in error_msg or "api key" in error_msg or "401" in error_msg:
                yield _sse_event("error", {"error": "auth_error", "detail": f"Ошибка авторизации: {e}"})
            else:
                yield _sse_event("error", {"error": "internal_error", "detail": str(e)})

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/build", response_model=BuildResponse)
async def build(req: BuildRequest):
    """Non-streaming endpoint (fallback)."""
    config = {
        "provider": req.provider or os.getenv("PROVIDER", ""),
        "api_key": req.api_key or os.getenv("API_KEY", ""),
        "model": req.model or os.getenv("MODEL", ""),
        "base_url": req.base_url or os.getenv("BASE_URL", ""),
    }

    if not config["provider"]:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_provider", "detail": "Провайдер не выбран. Укажи в настройках или в .env"},
        )

    try:
        provider = get_provider(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "unknown_provider", "detail": str(e)})

    try:
        async with asyncio.timeout(PIPELINE_TIMEOUT):
            decomposition = await decompose_device(
                provider, req.description,
                budget=req.budget, skill_level=req.skill_level, country=req.country,
            )
            decomposition = await enrich_bom(provider, decomposition, country=req.country)
            guide = await generate_guide(provider, decomposition, skill_level=req.skill_level)
    except TimeoutError:
        raise HTTPException(status_code=504, detail={"error": "pipeline_timeout", "detail": f"Pipeline не завершился за {PIPELINE_TIMEOUT} секунд"})
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"error": "llm_parse_error", "detail": str(e)})
    except Exception as e:
        error_msg = str(e).lower()
        if "auth" in error_msg or "api key" in error_msg or "401" in error_msg:
            raise HTTPException(status_code=401, detail={"error": "auth_error", "detail": f"Ошибка авторизации: {e}"})
        raise HTTPException(status_code=500, detail={"error": "internal_error", "detail": str(e)})

    return BuildResponse(decomposition=decomposition, guide=guide)


@router.post("/test-connection")
async def test_connection(req: TestConnectionRequest):
    """Проверяет что провайдер доступен и ключ валиден."""
    try:
        provider = get_provider({
            "provider": req.provider,
            "api_key": req.api_key,
            "model": req.model,
            "base_url": req.base_url,
        })
    except ValueError as e:
        return {"ok": False, "error": str(e)}

    if not provider.is_available():
        return {"ok": False, "error": "Провайдер недоступен"}

    # Пробуем простой запрос
    from ..providers.base import Message
    try:
        resp = await asyncio.wait_for(
            provider.complete([Message(role="user", content="Say OK")], temperature=0, max_tokens=10),
            timeout=15,
        )
        return {"ok": True, "model": resp.model, "provider": resp.provider}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/health")
def health():
    return {"status": "ok"}
