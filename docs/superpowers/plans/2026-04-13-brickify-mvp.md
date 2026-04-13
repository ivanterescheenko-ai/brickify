# Brickify MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack app where users describe a device, AI decomposes it into components with prices, and generates a step-by-step assembly guide.

**Architecture:** FastAPI backend with pluggable LLM providers (Anthropic, OpenAI, Google, xAI, DeepSeek, Ollama, LM Studio) behind a single `BaseLLMProvider` interface. Three agents (decomposer, researcher, writer) form the pipeline. React + Vite frontend with dark-first industrial design. Docker Compose for deployment.

**Tech Stack:** Python 3.12 / FastAPI / anthropic + openai + google-generativeai / React 19 / Vite / TypeScript / Zustand / CSS variables / Docker

---

## File Structure

```
brickify/
├── backend/
│   ├── __init__.py
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py           # BaseLLMProvider ABC, Message, LLMResponse dataclasses
│   │   ├── anthropic.py      # AnthropicProvider
│   │   ├── openai_provider.py # OpenAIProvider (base for xai, deepseek, ollama, lmstudio)
│   │   ├── google.py         # GoogleProvider
│   │   ├── xai.py            # XAIProvider (extends OpenAIProvider)
│   │   ├── deepseek.py       # DeepSeekProvider (extends OpenAIProvider)
│   │   ├── ollama.py         # OllamaProvider + LMStudioProvider (extends OpenAIProvider)
│   │   └── factory.py        # get_provider() factory
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── utils.py          # parse_llm_json() — shared JSON cleanup
│   │   ├── decomposer.py     # decompose_device()
│   │   ├── researcher.py     # search_component(), enrich_bom()
│   │   └── writer.py         # generate_guide()
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app, middleware, CORS
│   │   └── routes.py         # /build, /health endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts     # buildDevice() fetch wrapper
│   │   ├── store/
│   │   │   └── settings.ts   # Zustand persist store
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── StatCards.tsx
│   │   │   ├── ComponentTree.tsx
│   │   │   ├── BomTable.tsx
│   │   │   ├── LegoGuide.tsx
│   │   │   └── SkeletonLoading.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── Settings.tsx
│   │   ├── App.tsx
│   │   ├── App.css           # Full design system CSS
│   │   ├── main.tsx
│   │   └── index.css         # Reset + fonts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Task 1: Backend — Base Provider Interface + Utils

**Files:**
- Create: `backend/__init__.py`
- Create: `backend/providers/__init__.py`
- Create: `backend/providers/base.py`
- Create: `backend/agents/__init__.py`
- Create: `backend/agents/utils.py`
- Create: `backend/api/__init__.py`
- Create: `backend/requirements.txt`

- [ ] **Step 1: Create folder structure and __init__.py files**

```bash
cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files
mkdir -p backend/providers backend/agents backend/api
touch backend/__init__.py backend/providers/__init__.py backend/agents/__init__.py backend/api/__init__.py
```

- [ ] **Step 2: Write backend/providers/base.py**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Message:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str


class BaseLLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Проверяет что ключ есть и модель доступна"""
        ...
```

- [ ] **Step 3: Write backend/agents/utils.py — shared JSON parser**

```python
import json
import re


def parse_llm_json(raw: str) -> dict:
    """
    Парсит JSON из ответа LLM.
    Обрабатывает markdown fences, мусор до/после JSON.
    """
    text = raw.strip()

    # Убираем markdown code fences
    if "```" in text:
        # Ищем контент между первой и последней парой ```
        match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()

    # Пробуем найти JSON объект если есть мусор вокруг
    if not text.startswith("{"):
        start = text.find("{")
        if start != -1:
            text = text[start:]

    if not text.endswith("}"):
        end = text.rfind("}")
        if end != -1:
            text = text[: end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Модель вернула невалидный JSON: {e}\n\nОтвет (первые 500 символов): {raw[:500]}"
        )
```

- [ ] **Step 4: Write backend/requirements.txt**

```
fastapi>=0.115
uvicorn[standard]>=0.30
anthropic>=0.40
openai>=1.50
google-generativeai>=0.8
tavily-python>=0.5
python-dotenv>=1.0
pydantic>=2.0
httpx>=0.27
```

- [ ] **Step 5: Verify Python can import base module**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.base import BaseLLMProvider, Message, LLMResponse; print('OK')"`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/__init__.py backend/providers/__init__.py backend/providers/base.py backend/agents/__init__.py backend/agents/utils.py backend/api/__init__.py backend/requirements.txt
git commit -m "feat: базовый интерфейс LLM провайдера и JSON-парсер"
```

---

## Task 2: Backend — Anthropic Provider

**Files:**
- Create: `backend/providers/anthropic.py`

- [ ] **Step 1: Write backend/providers/anthropic.py**

```python
import asyncio

import anthropic

from .base import BaseLLMProvider, LLMResponse, Message


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        system = next((m.content for m in messages if m.role == "system"), None)
        user_msgs = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        # Anthropic SDK синхронный — оборачиваем в executor
        resp = await asyncio.to_thread(
            self.client.messages.create,
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system or "",
            messages=user_msgs,
        )
        return LLMResponse(
            content=resp.content[0].text,
            model=self.model,
            provider="anthropic",
        )

    def is_available(self) -> bool:
        return bool(self.client.api_key)
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.anthropic import AnthropicProvider; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/providers/anthropic.py
git commit -m "feat: Anthropic (Claude) LLM провайдер"
```

---

## Task 3: Backend — OpenAI Provider (base for xAI, DeepSeek, Ollama, LM Studio)

**Files:**
- Create: `backend/providers/openai_provider.py`

- [ ] **Step 1: Write backend/providers/openai_provider.py**

```python
from openai import AsyncOpenAI

from .base import BaseLLMProvider, LLMResponse, Message


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4.1",
        base_url: str = "https://api.openai.com/v1",
    ):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self._provider_name = "openai"

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return LLMResponse(
            content=resp.choices[0].message.content,
            model=self.model,
            provider=self._provider_name,
        )

    def is_available(self) -> bool:
        return bool(self.client.api_key)
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.openai_provider import OpenAIProvider; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/providers/openai_provider.py
git commit -m "feat: OpenAI LLM провайдер (базовый для совместимых API)"
```

---

## Task 4: Backend — Google, xAI, DeepSeek, Ollama, LM Studio Providers

**Files:**
- Create: `backend/providers/google.py`
- Create: `backend/providers/xai.py`
- Create: `backend/providers/deepseek.py`
- Create: `backend/providers/ollama.py`

- [ ] **Step 1: Write backend/providers/google.py**

```python
import google.generativeai as genai

from .base import BaseLLMProvider, LLMResponse, Message


class GoogleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
        self._key = api_key

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        history = []
        prompt = ""
        for m in messages:
            if m.role == "system":
                prompt = m.content + "\n\n"
            elif m.role == "user":
                history.append({"role": "user", "parts": [m.content]})
            elif m.role == "assistant":
                history.append({"role": "model", "parts": [m.content]})

        # Если есть system prompt, добавляем к первому user сообщению
        if prompt and history:
            history[0]["parts"][0] = prompt + history[0]["parts"][0]

        last_user = history.pop() if history else {"parts": [prompt]}
        chat = self.model.start_chat(history=history)
        resp = await chat.send_message_async(
            last_user["parts"][0],
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
        )
        return LLMResponse(
            content=resp.text, model=self.model_name, provider="google"
        )

    def is_available(self) -> bool:
        return bool(self._key)
```

- [ ] **Step 2: Write backend/providers/xai.py**

```python
from .openai_provider import OpenAIProvider


class XAIProvider(OpenAIProvider):
    def __init__(self, api_key: str, model: str = "grok-3"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://api.x.ai/v1",
        )
        self._provider_name = "xai"
```

- [ ] **Step 3: Write backend/providers/deepseek.py**

```python
from .openai_provider import OpenAIProvider


class DeepSeekProvider(OpenAIProvider):
    def __init__(self, api_key: str, model: str = "deepseek-r1"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://api.deepseek.com/v1",
        )
        self._provider_name = "deepseek"
```

- [ ] **Step 4: Write backend/providers/ollama.py**

```python
import httpx

from .openai_provider import OpenAIProvider


class OllamaProvider(OpenAIProvider):
    def __init__(
        self, model: str = "llama4-scout", base_url: str = "http://localhost:11434"
    ):
        self._ollama_base = base_url
        super().__init__(
            api_key="ollama",
            model=model,
            base_url=f"{base_url}/v1",
        )
        self._provider_name = "ollama"

    def is_available(self) -> bool:
        try:
            r = httpx.get(f"{self._ollama_base}/api/tags", timeout=2)
            return r.status_code == 200
        except Exception:
            return False


class LMStudioProvider(OpenAIProvider):
    def __init__(
        self, model: str = "local-model", base_url: str = "http://localhost:1234"
    ):
        super().__init__(
            api_key="lmstudio",
            model=model,
            base_url=f"{base_url}/v1",
        )
        self._provider_name = "lmstudio"

    def is_available(self) -> bool:
        try:
            r = httpx.get(f"{self.client.base_url}/models", timeout=2)
            return r.status_code == 200
        except Exception:
            return False
```

- [ ] **Step 5: Verify all imports**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.google import GoogleProvider; from backend.providers.xai import XAIProvider; from backend.providers.deepseek import DeepSeekProvider; from backend.providers.ollama import OllamaProvider, LMStudioProvider; print('OK')"`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/providers/google.py backend/providers/xai.py backend/providers/deepseek.py backend/providers/ollama.py
git commit -m "feat: Google, xAI, DeepSeek, Ollama, LM Studio провайдеры"
```

---

## Task 5: Backend — Provider Factory

**Files:**
- Create: `backend/providers/factory.py`

- [ ] **Step 1: Write backend/providers/factory.py**

```python
from .anthropic import AnthropicProvider
from .base import BaseLLMProvider
from .deepseek import DeepSeekProvider
from .google import GoogleProvider
from .ollama import LMStudioProvider, OllamaProvider
from .openai_provider import OpenAIProvider
from .xai import XAIProvider

SUPPORTED_PROVIDERS = [
    "anthropic",
    "openai",
    "google",
    "xai",
    "deepseek",
    "ollama",
    "lmstudio",
]


def get_provider(config: dict) -> BaseLLMProvider:
    """
    Создаёт LLM провайдер из конфигурации.

    config:
        provider: str — имя провайдера
        api_key: str — API ключ (пустой для ollama/lmstudio)
        model: str — имя модели (опционально, используется дефолт)
        base_url: str — кастомный URL (опционально)
    """
    p = config.get("provider", "").lower().strip()
    key = config.get("api_key", "")
    model = config.get("model", "")
    url = config.get("base_url", "")

    match p:
        case "anthropic":
            return AnthropicProvider(
                api_key=key, model=model or "claude-sonnet-4-20250514"
            )
        case "openai":
            return OpenAIProvider(api_key=key, model=model or "gpt-4.1")
        case "google" | "gemini":
            return GoogleProvider(api_key=key, model=model or "gemini-2.5-flash")
        case "xai" | "grok":
            return XAIProvider(api_key=key, model=model or "grok-3")
        case "deepseek":
            return DeepSeekProvider(api_key=key, model=model or "deepseek-r1")
        case "ollama":
            return OllamaProvider(
                model=model or "llama4-scout",
                base_url=url or "http://localhost:11434",
            )
        case "lmstudio":
            return LMStudioProvider(
                model=model or "local-model",
                base_url=url or "http://localhost:1234",
            )
        case _:
            raise ValueError(
                f"Неизвестный провайдер: '{p}'. "
                f"Доступные: {', '.join(SUPPORTED_PROVIDERS)}"
            )
```

- [ ] **Step 2: Verify factory works**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.factory import get_provider, SUPPORTED_PROVIDERS; p = get_provider({'provider': 'anthropic', 'api_key': 'test'}); print(f'Provider: {type(p).__name__}, Supported: {SUPPORTED_PROVIDERS}')"`
Expected: `Provider: AnthropicProvider, Supported: ['anthropic', 'openai', 'google', 'xai', 'deepseek', 'ollama', 'lmstudio']`

- [ ] **Step 3: Commit**

```bash
git add backend/providers/factory.py
git commit -m "feat: фабрика LLM провайдеров с поддержкой 7 провайдеров"
```

---

## Task 6: Backend — Decomposer Agent

**Files:**
- Create: `backend/agents/decomposer.py`

- [ ] **Step 1: Write backend/agents/decomposer.py**

```python
from ..providers.base import BaseLLMProvider, Message
from .utils import parse_llm_json

DECOMPOSE_SYSTEM = """
Ты эксперт по электронике и инженерии. Твоя задача — разобрать любое устройство
на функциональные блоки и конкретные компоненты.

Отвечай ТОЛЬКО валидным JSON без markdown и пояснений.

Формат ответа:
{
  "device": "название устройства",
  "description": "одно предложение что делает устройство",
  "estimated_budget_usd": 150,
  "difficulty": "beginner | intermediate | advanced",
  "blocks": [
    {
      "name": "название блока",
      "purpose": "зачем нужен этот блок",
      "components": [
        {
          "name": "конкретное название компонента",
          "spec": "ключевые характеристики (например: 2306 2400kv, 4S LiPo 1500mAh)",
          "quantity": 1,
          "estimated_price_usd": 25,
          "why": "зачем нужен в этом устройстве"
        }
      ]
    }
  ]
}
"""

DECOMPOSE_USER = """
Разбери это устройство на блоки и компоненты: {device_description}

Учти:
- Бюджет пользователя: {budget}
- Уровень сборки: {skill_level}
- Страна покупки: {country}

Будь конкретным в названиях компонентов — не "мотор", а "бесколлекторный мотор 2306 2400kv".
"""


async def decompose_device(
    provider: BaseLLMProvider,
    device_description: str,
    budget: str = "любой",
    skill_level: str = "intermediate",
    country: str = "любая",
) -> dict:
    messages = [
        Message(role="system", content=DECOMPOSE_SYSTEM),
        Message(
            role="user",
            content=DECOMPOSE_USER.format(
                device_description=device_description,
                budget=budget,
                skill_level=skill_level,
                country=country,
            ),
        ),
    ]

    response = await provider.complete(messages, temperature=0.2)
    return parse_llm_json(response.content)
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.agents.decomposer import decompose_device; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/decomposer.py
git commit -m "feat: агент декомпозиции устройства на блоки и компоненты"
```

---

## Task 7: Backend — Writer Agent

**Files:**
- Create: `backend/agents/writer.py`

- [ ] **Step 1: Write backend/agents/writer.py**

```python
from ..providers.base import BaseLLMProvider, Message
from .utils import parse_llm_json

WRITER_SYSTEM = """
Ты пишешь инструкции по сборке устройств для людей которые никогда не занимались этим раньше.

Правила:
- Никаких технических терминов без объяснения
- Каждый шаг — одно конкретное действие (не "настрой систему")
- Используй аналогии из обычной жизни
- Предупреждай о типичных ошибках
- Пиши как будто объясняешь другу, не как инструкция к микроволновке

Формат ответа — ТОЛЬКО JSON:
{
  "steps": [
    {
      "number": 1,
      "title": "Короткий заголовок",
      "what_to_do": "Конкретное действие простыми словами",
      "why": "Зачем этот шаг нужен",
      "tip": "Совет как не облажаться",
      "tools_needed": ["отвёртка Phillips #2"],
      "time_minutes": 10
    }
  ],
  "total_time_hours": 3,
  "tools_list": ["список всех инструментов"],
  "warnings": ["важные предупреждения безопасности"]
}
"""

WRITER_USER = """
Напиши инструкцию сборки для: {device_name}

Компоненты и блоки:
{blocks_summary}

Уровень пользователя: {skill_level}
"""


def _summarize_blocks(blocks: list) -> str:
    lines = []
    for block in blocks:
        lines.append(f"\n## {block['name']}: {block.get('purpose', '')}")
        for comp in block["components"]:
            lines.append(
                f"  - {comp['name']} ({comp.get('spec', '')}) x{comp['quantity']}"
            )
            if comp.get("why"):
                lines.append(f"    Зачем: {comp['why']}")
    return "\n".join(lines)


async def generate_guide(
    provider: BaseLLMProvider,
    decomposition: dict,
    skill_level: str = "beginner",
) -> dict:
    messages = [
        Message(role="system", content=WRITER_SYSTEM),
        Message(
            role="user",
            content=WRITER_USER.format(
                device_name=decomposition["device"],
                blocks_summary=_summarize_blocks(decomposition["blocks"]),
                skill_level=skill_level,
            ),
        ),
    ]

    response = await provider.complete(messages, temperature=0.4, max_tokens=4096)
    return parse_llm_json(response.content)
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.agents.writer import generate_guide; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/writer.py
git commit -m "feat: агент-писатель лего-инструкций сборки"
```

---

## Task 8: Backend — Researcher Agent

**Files:**
- Create: `backend/agents/researcher.py`

- [ ] **Step 1: Write backend/agents/researcher.py**

```python
import os

from ..providers.base import BaseLLMProvider, Message
from .utils import parse_llm_json

EXTRACT_PROMPT = """
Из этих результатов поиска извлеки информацию о компоненте "{component_name}".
Результаты: {answer}
{snippets}

Ответь ТОЛЬКО JSON:
{{
  "found": true,
  "price_usd": 25.0,
  "shop_name": "GetFPV",
  "shop_url": "https://...",
  "alternatives": [
    {{"name": "...", "price_usd": 20.0, "url": "..."}}
  ]
}}

Если ничего не нашёл:
{{"found": false}}
"""


def search_component(
    component_name: str, spec: str, country: str = "global"
) -> dict:
    """Ищет компонент через Tavily и возвращает результаты поиска."""
    tavily_key = os.getenv("TAVILY_API_KEY", "")
    if not tavily_key:
        return {"component": component_name, "spec": spec, "search_results": [], "answer": ""}

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=tavily_key)

        query = f"buy {component_name} {spec} price shop"
        if country.lower() not in ("global", "любая", ""):
            query += f" {country}"

        results = client.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=True,
        )

        return {
            "component": component_name,
            "spec": spec,
            "search_results": results.get("results", []),
            "answer": results.get("answer", ""),
        }
    except Exception:
        return {"component": component_name, "spec": spec, "search_results": [], "answer": ""}


async def enrich_bom(
    provider: BaseLLMProvider,
    decomposition: dict,
    country: str = "global",
) -> dict:
    """Обогащает BOM реальными ценами и ссылками через Tavily + LLM."""
    if not os.getenv("TAVILY_API_KEY"):
        return decomposition

    enriched_blocks = []

    for block in decomposition["blocks"]:
        enriched_components = []
        for comp in block["components"]:
            search_data = search_component(
                comp["name"], comp.get("spec", ""), country
            )

            sourcing = {"found": False}

            if search_data["search_results"] or search_data["answer"]:
                snippets = "\n".join(
                    f"- {r['url']}: {r.get('content', '')[:200]}"
                    for r in search_data["search_results"][:3]
                )
                msg = [
                    Message(
                        role="user",
                        content=EXTRACT_PROMPT.format(
                            component_name=comp["name"],
                            answer=search_data["answer"],
                            snippets=snippets,
                        ),
                    )
                ]

                try:
                    resp = await provider.complete(
                        msg, temperature=0.1, max_tokens=512
                    )
                    sourcing = parse_llm_json(resp.content)
                except (ValueError, Exception):
                    sourcing = {"found": False}

            enriched_components.append({**comp, "sourcing": sourcing})

        enriched_blocks.append({**block, "components": enriched_components})

    return {**decomposition, "blocks": enriched_blocks}
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.agents.researcher import search_component, enrich_bom; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/researcher.py
git commit -m "feat: агент поиска компонентов через Tavily с fallback"
```

---

## Task 9: Backend — FastAPI App + Routes

**Files:**
- Create: `backend/api/main.py`
- Create: `backend/api/routes.py`

- [ ] **Step 1: Write backend/api/main.py**

```python
import os
import time
import logging

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .routes import router

# Загружаем .env из корня проекта
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("brickify")

app = FastAPI(
    title="Brickify API",
    description="AI-powered hardware decomposition and assembly guide generator",
    version="0.1.0",
)

# CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Логируем method + path + status + duration. НЕ логируем body (может содержать API ключи)."""
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} ({duration_ms:.0f}ms)"
    )
    return response


app.include_router(router)
```

- [ ] **Step 2: Write backend/api/routes.py**

```python
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


class ErrorResponse(BaseModel):
    error: str
    detail: str


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
```

- [ ] **Step 3: Create .env.example in project root**

```env
# === Brickify — конфигурация ===

# Выбери один провайдер
PROVIDER=anthropic
MODEL=claude-sonnet-4-20250514
API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=openai
# MODEL=gpt-4.1
# API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=google
# MODEL=gemini-2.5-flash
# API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=xai
# MODEL=grok-3
# API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=deepseek
# MODEL=deepseek-r1
# API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=ollama
# MODEL=llama4-scout
# BASE_URL=http://localhost:11434

# PROVIDER=lmstudio
# MODEL=local-model
# BASE_URL=http://localhost:1234

# Tavily — поиск цен компонентов (опционально)
TAVILY_API_KEY=

# CORS — разрешённые origins через запятую
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Timeout pipeline в секундах
PIPELINE_TIMEOUT=180
```

- [ ] **Step 4: Verify FastAPI starts**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && pip install fastapi uvicorn python-dotenv pydantic 2>/dev/null && python -c "from backend.api.main import app; print(f'Routes: {[r.path for r in app.routes]}')"`
Expected: Output contains `/build` and `/health`

- [ ] **Step 5: Commit**

```bash
git add backend/api/main.py backend/api/routes.py .env.example
git commit -m "feat: FastAPI приложение с /build и /health эндпоинтами"
```

---

## Task 10: Frontend — Project Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Initialize frontend with Vite**

```bash
cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend
npm install zustand lucide-react react-router-dom
```

- [ ] **Step 3: Update frontend/index.html — add fonts**

Replace the content of `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="ru" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&family=Syne:wght@700;800&display=swap"
      rel="stylesheet"
    />
    <title>Brickify</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write frontend/src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Write frontend/src/App.tsx**

```tsx
import { useState } from 'react'
import { Settings as SettingsIcon, Sun, Moon } from 'lucide-react'
import Home from './pages/Home'
import Settings from './pages/Settings'
import './App.css'

type Page = 'home' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <div className="app">
      <div className="grid-background" />

      <header className="topbar">
        <button className="topbar-logo" onClick={() => setPage('home')}>
          Brickify
        </button>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className={`btn btn-ghost ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage(page === 'settings' ? 'home' : 'settings')}
          >
            <SettingsIcon size={16} />
            Настройки
          </button>
        </div>
      </header>

      <main className="main-content">
        {page === 'home' ? <Home /> : <Settings />}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Verify frontend builds**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend && npm run build`
Expected: Build succeeds (may have warnings, no errors)

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: фронтенд скаффолд — Vite + React + TypeScript + Zustand"
```

---

## Task 11: Frontend — Design System CSS

**Files:**
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.css`

- [ ] **Step 1: Write frontend/src/index.css — reset + CSS variables**

```css
/* === Reset === */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Шрифты */
  --font-display: 'Syne', sans-serif;
  --font-body: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Размеры текста */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 22px;
  --text-2xl: 30px;
  --text-3xl: 42px;

  /* Межстрочный */
  --leading-tight: 1.2;
  --leading-normal: 1.6;
  --leading-loose: 1.8;

  /* Пространство (базовая единица — 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Радиусы */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Ширина */
  --max-width: 1280px;
  --content-width: 900px;

  /* === ТЁМНАЯ ТЕМА (основная) === */
  --bg-base: #0d0e11;
  --bg-surface: #13151a;
  --bg-elevated: #1c1f26;
  --bg-hover: #212530;
  --bg-grid: rgba(255, 255, 255, 0.03);

  --text-primary: #f0f0f0;
  --text-secondary: #8a8f9e;
  --text-tertiary: #4a4f5e;
  --text-inverse: #0d0e11;

  --accent: #3b82f6;
  --accent-dim: rgba(59, 130, 246, 0.15);
  --accent-glow: rgba(59, 130, 246, 0.08);

  --success: #22c55e;
  --success-dim: rgba(34, 197, 94, 0.12);
  --warning: #f59e0b;
  --warning-dim: rgba(245, 158, 11, 0.12);
  --danger: #ef4444;
  --danger-dim: rgba(239, 68, 68, 0.12);

  --border: rgba(255, 255, 255, 0.07);
  --border-medium: rgba(255, 255, 255, 0.12);
  --border-accent: rgba(59, 130, 246, 0.4);
}

/* === СВЕТЛАЯ ТЕМА === */
[data-theme='light'] {
  --bg-base: #f8f9fb;
  --bg-surface: #ffffff;
  --bg-elevated: #f1f3f7;
  --bg-hover: #eaecf2;
  --bg-grid: rgba(0, 0, 0, 0.03);
  --text-primary: #111318;
  --text-secondary: #5c6070;
  --text-tertiary: #9ca3af;
  --text-inverse: #f0f0f0;
  --border: rgba(0, 0, 0, 0.07);
  --border-medium: rgba(0, 0, 0, 0.12);
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--bg-base);
  -webkit-font-smoothing: antialiased;
}

/* === Анимации === */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Write frontend/src/App.css — components + layout**

```css
/* === Layout === */
.app {
  min-height: 100vh;
  position: relative;
}

.grid-background {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(var(--bg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-6);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.topbar-logo {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-lg);
  color: var(--text-primary);
  letter-spacing: -0.02em;
  background: none;
  border: none;
  cursor: pointer;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.main-content {
  position: relative;
  z-index: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}

/* === Buttons === */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 120ms ease;
  white-space: nowrap;
  user-select: none;
}
.btn:active { transform: scale(0.97); }

.btn-primary {
  background: var(--accent);
  color: white;
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: var(--radius-md);
}
.btn-primary:hover { background: #2563eb; }
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-medium);
  height: 36px;
  padding: 0 14px;
  font-size: 14px;
  border-radius: var(--radius-md);
}
.btn-secondary:hover { background: var(--bg-hover); }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  border-radius: var(--radius-sm);
}
.btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
.btn-ghost.active { color: var(--accent); }

/* === Inputs === */
.input {
  height: 36px;
  padding: 0 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 150ms ease;
  width: 100%;
}
.input:focus { border-color: var(--border-accent); }
.input::placeholder { color: var(--text-tertiary); }

.select {
  height: 36px;
  padding: 0 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  width: 100%;
  cursor: pointer;
}

/* === Search Bar === */
.search-container {
  position: relative;
  width: 100%;
  max-width: 720px;
}

.search-input {
  width: 100%;
  height: 56px;
  padding: 0 140px 0 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-xl);
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.search-input::placeholder { color: var(--text-tertiary); }
.search-input:focus {
  border-color: var(--border-accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  height: 40px;
  padding: 0 18px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.search-btn:hover { background: #2563eb; }
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* === Cards === */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: border-color 200ms ease;
}
.card:hover { border-color: var(--border-medium); }

/* === Provider Card === */
.provider-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: all 150ms ease;
  text-align: center;
}
.provider-card:hover {
  border-color: var(--border-medium);
  background: var(--bg-hover);
}
.provider-card.selected {
  border-color: var(--border-accent);
  background: var(--accent-dim);
}
.provider-card-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}
.provider-card-org {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* === Stat Card === */
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
}
.stat-label {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: var(--space-2);
}
.stat-value {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}
.stat-card.success .stat-value { color: var(--success); }
.stat-card.warning .stat-value { color: var(--warning); }
.stat-card.accent .stat-value { color: var(--accent); }

/* === Text utilities === */
.text-display {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: var(--leading-tight);
  color: var(--text-primary);
}
.text-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.text-mono {
  font-family: var(--font-mono);
  font-weight: 400;
}

/* === Component Tree === */
.tree-root { display: flex; flex-direction: column; gap: 2px; }
.tree-block { border-radius: var(--radius-md); overflow: hidden; animation: fadeUp 250ms ease both; }
.tree-block-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: background 150ms ease;
  user-select: none;
}
.tree-block-header:hover { background: var(--bg-hover); }
.tree-block-icon { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.tree-block-name { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); flex: 1; }
.tree-block-count { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-tertiary); }
.tree-block-chevron { color: var(--text-tertiary); transition: transform 200ms ease; }
.tree-block-chevron.open { transform: rotate(90deg); }

.tree-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4) var(--space-2) var(--space-8);
  border-top: 1px solid var(--border);
  transition: background 120ms ease;
}
.tree-item:hover { background: var(--bg-hover); }
.tree-item-info { flex: 1; }
.tree-item-name { font-size: var(--text-sm); color: var(--text-primary); }
.tree-item-spec { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-tertiary); margin-top: 2px; }
.tree-item-price { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--success); flex-shrink: 0; }

/* === BOM Table === */
.bom-table { width: 100%; border-collapse: collapse; }
.bom-table th {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.bom-table td {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.bom-table tr:last-child td { border-bottom: none; }
.bom-table tr:hover td { background: var(--bg-hover); }
.bom-table tr { animation: fadeUp 300ms ease both; }

.bom-name { font-weight: 500; }
.bom-spec { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; }
.bom-qty { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-secondary); text-align: center; }
.bom-price { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--success); text-align: right; }
.bom-shop {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.bom-shop:hover { background: var(--accent); color: white; }
.bom-total td { font-weight: 500; border-top: 1px solid var(--border-medium); padding-top: var(--space-3); }
.bom-total .bom-price { font-size: var(--text-base); color: var(--text-primary); }

/* === Lego Guide === */
.guide-steps { display: flex; flex-direction: column; position: relative; }
.guide-steps::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 24px;
  bottom: 24px;
  width: 1px;
  background: var(--border-medium);
}
.guide-step { display: flex; gap: var(--space-4); padding: var(--space-5) 0; position: relative; }
.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.step-content { flex: 1; padding-top: 8px; }
.step-title { font-size: var(--text-base); font-weight: 500; color: var(--text-primary); margin-bottom: var(--space-2); }
.step-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-loose); margin-bottom: var(--space-3); }
.step-tip {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--warning-dim);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--warning);
  font-size: var(--text-sm);
  color: var(--warning);
}
.step-tools { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
.tool-tag {
  font-size: var(--text-xs);
  padding: 3px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}
.step-time { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2); }

/* === Skeleton === */
.skeleton {
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease infinite;
}

/* === Error === */
.error-container {
  padding: var(--space-4);
  background: var(--danger-dim);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 14px;
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

/* === Badge === */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}
.badge-default { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
.badge-accent { background: var(--accent-dim); color: var(--accent); }
.badge-success { background: var(--success-dim); color: var(--success); }
.badge-warning { background: var(--warning-dim); color: var(--warning); }

/* === Dashboard grid === */
.dashboard-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: var(--space-4);
  align-items: start;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}

/* === Responsive === */
@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr; }
  .search-input { padding-right: 60px; }
  .search-btn span { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/App.css
git commit -m "feat: полная дизайн-система — CSS variables, компоненты, анимации"
```

---

## Task 12: Frontend — Store + API Client

**Files:**
- Create: `frontend/src/store/settings.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend/src/store
mkdir -p /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend/src/api
```

- [ ] **Step 2: Write frontend/src/store/settings.ts**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  tavilyKey: string
  setSettings: (s: Partial<Omit<Settings, 'setSettings'>>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      provider: '',
      apiKey: '',
      model: '',
      baseUrl: '',
      tavilyKey: '',
      setSettings: (s) => set(s),
    }),
    { name: 'brickify-settings' }
  )
)
```

- [ ] **Step 3: Write frontend/src/api/client.ts**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface BuildParams {
  description: string
  budget?: string
  skill_level?: string
  country?: string
  provider: string
  api_key: string
  model: string
  base_url?: string
}

export interface BuildResult {
  decomposition: {
    device: string
    description: string
    estimated_budget_usd: number
    difficulty: string
    blocks: Array<{
      name: string
      purpose: string
      components: Array<{
        name: string
        spec: string
        quantity: number
        estimated_price_usd: number
        why: string
        sourcing?: {
          found: boolean
          price_usd?: number
          shop_name?: string
          shop_url?: string
          alternatives?: Array<{ name: string; price_usd: number; url: string }>
        }
      }>
    }>
  }
  guide: {
    steps: Array<{
      number: number
      title: string
      what_to_do: string
      why: string
      tip: string
      tools_needed: string[]
      time_minutes: number
    }>
    total_time_hours: number
    tools_list: string[]
    warnings: string[]
  }
}

export async function buildDevice(params: BuildParams): Promise<BuildResult> {
  const res = await fetch(`${API_BASE}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }))
    const detail = typeof err.detail === 'string'
      ? err.detail
      : err.detail?.detail || 'Неизвестная ошибка'
    throw new Error(detail)
  }

  return res.json()
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/settings.ts frontend/src/api/client.ts
git commit -m "feat: Zustand store для настроек + API клиент"
```

---

## Task 13: Frontend — Settings Page

**Files:**
- Create: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Write frontend/src/pages/Settings.tsx**

```tsx
import { useState } from 'react'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useSettings } from '../store/settings'
import { checkHealth } from '../api/client'

const PROVIDERS = [
  { id: 'anthropic', name: 'Claude', org: 'Anthropic', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai', name: 'GPT-4.1', org: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4.1' },
  { id: 'google', name: 'Gemini', org: 'Google', placeholder: 'AIzaSy...', defaultModel: 'gemini-2.5-flash' },
  { id: 'xai', name: 'Grok', org: 'xAI', placeholder: 'xai-...', defaultModel: 'grok-3' },
  { id: 'deepseek', name: 'DeepSeek', org: 'DeepSeek', placeholder: 'sk-...', defaultModel: 'deepseek-r1' },
  { id: 'ollama', name: 'Ollama', org: 'Локально', placeholder: '', defaultModel: 'llama4-scout', noKey: true },
  { id: 'lmstudio', name: 'LM Studio', org: 'Локально', placeholder: '', defaultModel: 'local-model', noKey: true },
] as const

type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error'

export default function Settings() {
  const { provider, apiKey, model, baseUrl, tavilyKey, setSettings } = useSettings()
  const [status, setStatus] = useState<ConnectionStatus>('idle')

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)
  const needsKey = selectedProvider ? !('noKey' in selectedProvider && selectedProvider.noKey) : true
  const needsUrl = provider === 'ollama' || provider === 'lmstudio'

  const handleSelectProvider = (id: string) => {
    const p = PROVIDERS.find((pr) => pr.id === id)
    setSettings({
      provider: id,
      model: p?.defaultModel || '',
      baseUrl: id === 'ollama' ? 'http://localhost:11434' : id === 'lmstudio' ? 'http://localhost:1234' : '',
    })
    setStatus('idle')
  }

  const handleCheck = async () => {
    setStatus('checking')
    const ok = await checkHealth()
    setStatus(ok ? 'ok' : 'error')
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="text-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
        Настройки
      </h1>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-4)' }}>
          Выбери AI-модель
        </div>
        <div className="providers-grid">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className={`provider-card ${provider === p.id ? 'selected' : ''}`}
              onClick={() => handleSelectProvider(p.id)}
            >
              <div className="provider-card-name">{p.name}</div>
              <div className="provider-card-org">{p.org}</div>
            </div>
          ))}
        </div>
      </section>

      {provider && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {needsKey && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                API ключ
              </label>
              <input
                className="input"
                type="password"
                placeholder={selectedProvider?.placeholder}
                value={apiKey}
                onChange={(e) => setSettings({ apiKey: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Модель
            </label>
            <input
              className="input"
              placeholder={selectedProvider?.defaultModel}
              value={model}
              onChange={(e) => setSettings({ model: e.target.value })}
            />
          </div>

          {needsUrl && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Base URL
              </label>
              <input
                className="input"
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setSettings({ baseUrl: e.target.value })}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary" onClick={handleCheck} disabled={status === 'checking'}>
              {status === 'checking' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Проверить подключение
            </button>
            {status === 'ok' && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <CheckCircle size={14} /> Работает
              </span>
            )}
            {status === 'error' && (
              <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <AlertTriangle size={14} /> Бэкенд недоступен
              </span>
            )}
          </div>
        </section>
      )}

      <section style={{ marginTop: 'var(--space-10)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)' }}>
        <div className="text-label" style={{ marginBottom: 'var(--space-4)' }}>
          Поиск компонентов (опционально)
        </div>
        <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)', letterSpacing: 0, textTransform: 'none' }}>
          Tavily API ключ — для поиска цен
        </label>
        <input
          className="input"
          type="password"
          placeholder="tvly-..."
          value={tavilyKey}
          onChange={(e) => setSettings({ tavilyKey: e.target.value })}
        />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
          Бесплатно 1000 запросов/месяц. Без ключа будут показаны оценочные цены.
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Settings.tsx
git commit -m "feat: страница Settings — выбор провайдера, ключ, модель"
```

---

## Task 14: Frontend — Components (SearchBar, StatCards, SkeletonLoading)

**Files:**
- Create: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/components/StatCards.tsx`
- Create: `frontend/src/components/SkeletonLoading.tsx`

- [ ] **Step 1: Create components directory**

```bash
mkdir -p /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend/src/components
```

- [ ] **Step 2: Write frontend/src/components/SearchBar.tsx**

```tsx
import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
}

const EXAMPLES = ['FPV дрон', 'Arduino термостат', '3D принтер', 'Умная лампа']

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !loading) {
      onSearch(query.trim())
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="text-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Что собираем?
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 'var(--space-8)' }}>
        Опиши устройство — AI разберёт на части и найдёт где купить
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <div className="search-container">
          <input
            className="search-input"
            placeholder="Например: FPV дрон для гонок 5 дюймов"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
            {loading
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={16} />
            }
            <span>Собрать</span>
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={() => { setQuery(ex); onSearch(ex) }}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write frontend/src/components/StatCards.tsx**

```tsx
interface StatCardsProps {
  totalComponents: number
  totalBudget: number
  difficulty: string
  hasTavily: boolean
}

export default function StatCards({ totalComponents, totalBudget, difficulty, hasTavily }: StatCardsProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card accent">
        <div className="stat-label">Компонентов</div>
        <div className="stat-value">{totalComponents}</div>
      </div>
      <div className="stat-card success">
        <div className="stat-label">{hasTavily ? 'Бюджет' : 'Оценка AI'}</div>
        <div className="stat-value">${totalBudget.toFixed(0)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Сложность</div>
        <div className="stat-value" style={{ fontSize: 20 }}>{difficulty}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write frontend/src/components/SkeletonLoading.tsx**

```tsx
import { Loader2 } from 'lucide-react'

const PHASES = [
  'Анализирую устройство...',
  'Разбиваю на блоки...',
  'Ищу компоненты...',
  'Считаю бюджет...',
  'Пишу инструкцию...',
]

interface SkeletonLoadingProps {
  startTime: number
}

export default function SkeletonLoading({ startTime }: SkeletonLoadingProps) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const phaseIndex = Math.min(Math.floor(elapsed / 8), PHASES.length - 1)

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-6)',
      }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        {PHASES[phaseIndex]}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[100, 85, 90, 75, 80].map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: 14, width: `${w}%`, animationDelay: `${i * 80}ms` }} />
            <div className="skeleton" style={{ height: 14, width: 50, flexShrink: 0, animationDelay: `${i * 80 + 40}ms` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SearchBar.tsx frontend/src/components/StatCards.tsx frontend/src/components/SkeletonLoading.tsx
git commit -m "feat: SearchBar, StatCards, SkeletonLoading компоненты"
```

---

## Task 15: Frontend — ComponentTree + BomTable + LegoGuide

**Files:**
- Create: `frontend/src/components/ComponentTree.tsx`
- Create: `frontend/src/components/BomTable.tsx`
- Create: `frontend/src/components/LegoGuide.tsx`

- [ ] **Step 1: Write frontend/src/components/ComponentTree.tsx**

```tsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface ComponentTreeProps {
  blocks: BuildResult['decomposition']['blocks']
}

export default function ComponentTree({ blocks }: ComponentTreeProps) {
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set([0]))

  const toggleBlock = (i: number) => {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
        <div className="text-label">Структура устройства</div>
      </div>
      <div className="tree-root">
        {blocks.map((block, i) => (
          <div className="tree-block" key={i}>
            <div className="tree-block-header" onClick={() => toggleBlock(i)}>
              <div className="tree-block-icon" />
              <span className="tree-block-name">{block.name}</span>
              <span className="tree-block-count">{block.components.length}</span>
              <ChevronRight
                size={14}
                className={`tree-block-chevron ${openBlocks.has(i) ? 'open' : ''}`}
              />
            </div>
            {openBlocks.has(i) &&
              block.components.map((comp, j) => (
                <div className="tree-item" key={j}>
                  <div className="tree-item-info">
                    <div className="tree-item-name">{comp.name}</div>
                    {comp.spec && <div className="tree-item-spec">{comp.spec}</div>}
                  </div>
                  <div className="tree-item-price">
                    ${comp.sourcing?.found ? comp.sourcing.price_usd?.toFixed(0) : comp.estimated_price_usd}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write frontend/src/components/BomTable.tsx**

```tsx
import { ExternalLink, Copy } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface BomTableProps {
  blocks: BuildResult['decomposition']['blocks']
  hasTavily: boolean
}

export default function BomTable({ blocks, hasTavily }: BomTableProps) {
  const allComponents = blocks.flatMap((b) => b.components)
  const totalPrice = allComponents.reduce((sum, c) => {
    const price = c.sourcing?.found ? (c.sourcing.price_usd ?? 0) : c.estimated_price_usd
    return sum + price * c.quantity
  }, 0)

  const copyBom = () => {
    const lines = ['| Компонент | Кол-во | Цена |', '|---|---|---|']
    allComponents.forEach((c) => {
      const price = c.sourcing?.found ? c.sourcing.price_usd : c.estimated_price_usd
      lines.push(`| ${c.name} | ${c.quantity} | $${price} |`)
    })
    lines.push(`| **Итого** | | **$${totalPrice.toFixed(0)}** |`)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div className="text-label">Bill of Materials</div>
        <button className="btn btn-ghost" onClick={copyBom} style={{ gap: 4 }}>
          <Copy size={12} /> Скопировать
        </button>
      </div>

      {!hasTavily && (
        <div style={{
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--warning-dim)',
          fontSize: 'var(--text-xs)',
          color: 'var(--warning)',
        }}>
          Цены — оценка AI. Подключи Tavily API для актуальных цен.
        </div>
      )}

      <table className="bom-table">
        <thead>
          <tr>
            <th>Компонент</th>
            <th style={{ textAlign: 'center' }}>Кол-во</th>
            <th style={{ textAlign: 'right' }}>Цена</th>
            <th>Где купить</th>
          </tr>
        </thead>
        <tbody>
          {allComponents.map((comp, i) => {
            const price = comp.sourcing?.found
              ? comp.sourcing.price_usd
              : comp.estimated_price_usd
            return (
              <tr key={i} style={{ animationDelay: `${i * 40}ms` }}>
                <td>
                  <div className="bom-name">{comp.name}</div>
                  {comp.spec && <div className="bom-spec">{comp.spec}</div>}
                </td>
                <td className="bom-qty">{comp.quantity}</td>
                <td className="bom-price">${price}</td>
                <td>
                  {comp.sourcing?.found && comp.sourcing.shop_url ? (
                    <a
                      href={comp.sourcing.shop_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bom-shop"
                    >
                      {comp.sourcing.shop_name} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
          <tr className="bom-total">
            <td>Итого</td>
            <td className="bom-qty">{allComponents.reduce((s, c) => s + c.quantity, 0)}</td>
            <td className="bom-price">${totalPrice.toFixed(0)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Write frontend/src/components/LegoGuide.tsx**

```tsx
import { AlertTriangle, Clock, Wrench } from 'lucide-react'
import type { BuildResult } from '../api/client'

interface LegoGuideProps {
  guide: BuildResult['guide']
}

export default function LegoGuide({ guide }: LegoGuideProps) {
  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 className="text-display" style={{ fontSize: 'var(--text-xl)' }}>
          Инструкция сборки
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> ~{guide.total_time_hours}ч
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wrench size={14} /> {guide.tools_list?.length || 0} инструментов
          </span>
        </div>
      </div>

      {guide.warnings && guide.warnings.length > 0 && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--danger-dim)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--danger)',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            {guide.warnings.map((w, i) => (
              <div key={i} style={{ marginBottom: i < guide.warnings.length - 1 ? 4 : 0 }}>{w}</div>
            ))}
          </div>
        </div>
      )}

      <div className="guide-steps">
        {guide.steps.map((step) => (
          <div className="guide-step" key={step.number} style={{ animation: `fadeUp 300ms ease ${step.number * 60}ms both` }}>
            <div className="step-number">{step.number}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-body">{step.what_to_do}</div>

              {step.tip && (
                <div className="step-tip">
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {step.tip}
                </div>
              )}

              {step.tools_needed && step.tools_needed.length > 0 && (
                <div className="step-tools">
                  {step.tools_needed.map((tool, i) => (
                    <span className="tool-tag" key={i}>{tool}</span>
                  ))}
                </div>
              )}

              <div className="step-time">~{step.time_minutes} мин</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ComponentTree.tsx frontend/src/components/BomTable.tsx frontend/src/components/LegoGuide.tsx
git commit -m "feat: ComponentTree, BomTable, LegoGuide компоненты"
```

---

## Task 16: Frontend — Home Page (glue everything together)

**Files:**
- Create: `frontend/src/pages/Home.tsx`

- [ ] **Step 1: Write frontend/src/pages/Home.tsx**

```tsx
import { useState, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useSettings } from '../store/settings'
import { buildDevice, type BuildResult } from '../api/client'
import SearchBar from '../components/SearchBar'
import StatCards from '../components/StatCards'
import ComponentTree from '../components/ComponentTree'
import BomTable from '../components/BomTable'
import LegoGuide from '../components/LegoGuide'
import SkeletonLoading from '../components/SkeletonLoading'

export default function Home() {
  const settings = useSettings()
  const [result, setResult] = useState<BuildResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef(0)

  const handleSearch = async (query: string) => {
    if (!settings.provider) {
      setError('Сначала выбери AI-провайдер в настройках')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    startTimeRef.current = Date.now()

    try {
      const data = await buildDevice({
        description: query,
        provider: settings.provider,
        api_key: settings.apiKey,
        model: settings.model,
        base_url: settings.baseUrl,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const totalComponents = result
    ? result.decomposition.blocks.reduce((sum, b) => sum + b.components.length, 0)
    : 0
  const totalBudget = result?.decomposition.estimated_budget_usd ?? 0
  const difficulty = result?.decomposition.difficulty ?? ''
  const hasTavily = result
    ? result.decomposition.blocks.some((b) =>
        b.components.some((c) => c.sourcing?.found)
      )
    : false

  return (
    <div>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="error-container" style={{ maxWidth: 720, margin: '0 auto var(--space-6)' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Что-то пошло не так</div>
            <div style={{ opacity: 0.8 }}>{error}</div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, color: 'var(--danger)' }}
              onClick={() => setError(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <SkeletonLoading startTime={startTimeRef.current} />
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeUp 400ms ease' }}>
          <StatCards
            totalComponents={totalComponents}
            totalBudget={totalBudget}
            difficulty={difficulty}
            hasTavily={hasTavily}
          />

          <div className="dashboard-grid">
            <ComponentTree blocks={result.decomposition.blocks} />
            <BomTable blocks={result.decomposition.blocks} hasTavily={hasTavily} />
          </div>

          <LegoGuide guide={result.guide} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat: главная страница — поиск, результаты, инструкция сборки"
```

---

## Task 17: Docker — Backend + Frontend + Compose

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Write backend/Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Write frontend/Dockerfile**

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Write docker-compose.yml**

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile docker-compose.yml
git commit -m "feat: Docker — backend + frontend + compose"
```

---

## Task 18: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# Brickify

Опиши что хочешь собрать — AI разберёт на компоненты, найдёт где купить и напишет пошаговую инструкцию.

## Быстрый старт (Docker)

```bash
cp .env.example .env
# Отредактируй .env — укажи провайдер и API ключ
docker compose up --build
```

Открой http://localhost:3000

## Без Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
cd ..
cp .env.example .env
# Отредактируй .env
cd backend
uvicorn api.main:app --reload --port 8000

# Frontend (другой терминал)
cd frontend
npm install
npm run dev
```

## Поддерживаемые AI-провайдеры

| Провайдер | Модель по умолчанию | API ключ |
|---|---|---|
| Anthropic (Claude) | claude-sonnet-4-20250514 | Нужен |
| OpenAI (GPT) | gpt-4.1 | Нужен |
| Google (Gemini) | gemini-2.5-flash | Нужен |
| xAI (Grok) | grok-3 | Нужен |
| DeepSeek | deepseek-r1 | Нужен |
| Ollama | llama4-scout | Не нужен (локально) |
| LM Studio | local-model | Не нужен (локально) |

## Поиск цен (опционально)

Для актуальных цен и ссылок на магазины — добавь `TAVILY_API_KEY` в `.env`.
Бесплатно 1000 запросов/месяц на [tavily.com](https://tavily.com).

Без Tavily — показываются оценочные цены от AI.

## Лицензия

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README с инструкциями установки и списком провайдеров"
```

---

## Task 19: Final Verification

- [ ] **Step 1: Install backend dependencies**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && pip install -r backend/requirements.txt`

- [ ] **Step 2: Verify all backend imports work**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && python -c "from backend.providers.factory import get_provider, SUPPORTED_PROVIDERS; from backend.agents.decomposer import decompose_device; from backend.agents.writer import generate_guide; from backend.agents.researcher import enrich_bom; from backend.api.main import app; print(f'Providers: {SUPPORTED_PROVIDERS}'); print(f'Routes: {[r.path for r in app.routes]}'); print('ALL OK')"`
Expected: `ALL OK` with providers list and routes

- [ ] **Step 3: Verify frontend builds clean**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Start backend and test /health**

Run: `cd /Users/ivanteresenko/Downloads/Antigravity/brickfy/files && uvicorn backend.api.main:app --port 8000 &; sleep 2; curl http://localhost:8000/health; kill %1`
Expected: `{"status":"ok"}`

- [ ] **Step 5: Final commit with all remaining files**

Check `git status` for any unstaged files, add them, commit if needed.
