import asyncio
import os

from fastapi import APIRouter, HTTPException
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


class BuildResponse(BaseModel):
    decomposition: dict
    guide: dict


@router.post("/build", response_model=BuildResponse)
async def build(req: BuildRequest):
    # Конфиг из запроса (UI) или из .env
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
        raise HTTPException(
            status_code=400,
            detail={"error": "unknown_provider", "detail": str(e)},
        )

    try:
        async with asyncio.timeout(PIPELINE_TIMEOUT):
            # Шаг 1: декомпозиция
            decomposition = await decompose_device(
                provider,
                req.description,
                budget=req.budget,
                skill_level=req.skill_level,
                country=req.country,
            )

            # Шаг 2: поиск компонентов (если Tavily доступен)
            decomposition = await enrich_bom(
                provider, decomposition, country=req.country
            )

            # Шаг 3: генерация инструкции
            guide = await generate_guide(
                provider, decomposition, skill_level=req.skill_level
            )

    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"error": "pipeline_timeout", "detail": f"Pipeline не завершился за {PIPELINE_TIMEOUT} секунд"},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": "llm_parse_error", "detail": str(e)},
        )
    except Exception as e:
        error_msg = str(e).lower()
        if "auth" in error_msg or "api key" in error_msg or "401" in error_msg:
            raise HTTPException(
                status_code=401,
                detail={"error": "auth_error", "detail": f"Ошибка авторизации у провайдера: {e}"},
            )
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "detail": f"Внутренняя ошибка: {e}"},
        )

    return BuildResponse(decomposition=decomposition, guide=guide)


@router.get("/health")
def health():
    return {"status": "ok"}
