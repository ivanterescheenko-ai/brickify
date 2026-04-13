# HardwareBuilder — план реализации

> Open source инструмент: описываешь что хочешь собрать → AI декомпозирует → находит компоненты и где купить → генерирует лего-инструкцию сборки. Поддерживает любые LLM.

---

## Структура проекта

```
hardwarebuilder/
├── backend/
│   ├── providers/          # LLM адаптеры
│   │   ├── base.py
│   │   ├── anthropic.py
│   │   ├── openai.py
│   │   ├── google.py
│   │   ├── xai.py
│   │   ├── deepseek.py
│   │   ├── ollama.py       # + LM Studio
│   │   └── factory.py
│   ├── agents/
│   │   ├── decomposer.py   # разбивает устройство на блоки
│   │   ├── researcher.py   # ищет компоненты
│   │   └── writer.py       # генерирует инструкцию
│   ├── api/
│   │   ├── main.py         # FastAPI app
│   │   └── routes.py
│   └── requirements.txt
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── Settings.tsx
│   │   └── components/
│   │       ├── ComponentTree.tsx
│   │       ├── BomTable.tsx
│   │       └── LegoGuide.tsx
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Блок 1 — LLM абстракция

**Цель:** один интерфейс для всех моделей. Агентам всё равно кто под капотом.

### `backend/providers/base.py`

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class Message:
    role: str   # "user" | "assistant" | "system"
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

### `backend/providers/anthropic.py`

```python
import anthropic
from .base import BaseLLMProvider, Message, LLMResponse

class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    async def complete(self, messages, temperature=0.3, max_tokens=4096):
        system = next((m.content for m in messages if m.role == "system"), None)
        user_msgs = [{"role": m.role, "content": m.content}
                     for m in messages if m.role != "system"]

        resp = self.client.messages.create(
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

### `backend/providers/openai.py`

```python
from openai import AsyncOpenAI
from .base import BaseLLMProvider, Message, LLMResponse

class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o",
                 base_url: str = "https://api.openai.com/v1"):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def complete(self, messages, temperature=0.3, max_tokens=4096):
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return LLMResponse(
            content=resp.choices[0].message.content,
            model=self.model,
            provider="openai",
        )

    def is_available(self) -> bool:
        return bool(self.client.api_key)
```

### `backend/providers/google.py`

```python
import google.generativeai as genai
from .base import BaseLLMProvider, Message, LLMResponse

class GoogleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
        self._key = api_key

    async def complete(self, messages, temperature=0.3, max_tokens=4096):
        # Gemini принимает историю иначе — конвертируем
        history = []
        prompt = ""
        for m in messages:
            if m.role == "system":
                prompt = m.content + "\n\n"
            elif m.role == "user":
                history.append({"role": "user", "parts": [m.content]})
            elif m.role == "assistant":
                history.append({"role": "model", "parts": [m.content]})

        last_user = history.pop() if history else {"parts": [prompt]}
        chat = self.model.start_chat(history=history)
        resp = await chat.send_message_async(
            last_user["parts"][0],
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
        )
        return LLMResponse(content=resp.text, model=self.model_name, provider="google")

    def is_available(self) -> bool:
        return bool(self._key)
```

### `backend/providers/xai.py`

```python
# Grok — OpenAI-совместимый API
from .openai import OpenAIProvider

class XAIProvider(OpenAIProvider):
    def __init__(self, api_key: str, model: str = "grok-3-mini"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://api.x.ai/v1",
        )
        # переопределяем provider в ответе
    async def complete(self, messages, temperature=0.3, max_tokens=4096):
        resp = await super().complete(messages, temperature, max_tokens)
        resp.provider = "xai"
        return resp
```

### `backend/providers/deepseek.py`

```python
# DeepSeek — тоже OpenAI-совместимый
from .openai import OpenAIProvider

class DeepSeekProvider(OpenAIProvider):
    def __init__(self, api_key: str, model: str = "deepseek-chat"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://api.deepseek.com/v1",
        )
    async def complete(self, messages, temperature=0.3, max_tokens=4096):
        resp = await super().complete(messages, temperature, max_tokens)
        resp.provider = "deepseek"
        return resp
```

### `backend/providers/ollama.py`

```python
# Ollama и LM Studio — оба OpenAI-совместимы локально
from .openai import OpenAIProvider

class OllamaProvider(OpenAIProvider):
    def __init__(self, model: str = "llama3", base_url: str = "http://localhost:11434"):
        super().__init__(api_key="ollama", model=model, base_url=f"{base_url}/v1")

    def is_available(self) -> bool:
        import httpx
        try:
            r = httpx.get(self.client.base_url.replace("/v1", "/api/tags"), timeout=2)
            return r.status_code == 200
        except Exception:
            return False

class LMStudioProvider(OllamaProvider):
    def __init__(self, model: str = "local-model", base_url: str = "http://localhost:1234"):
        super().__init__(model=model, base_url=base_url)
```

### `backend/providers/factory.py`

```python
import os
from .base import BaseLLMProvider
from .anthropic import AnthropicProvider
from .openai import OpenAIProvider
from .google import GoogleProvider
from .xai import XAIProvider
from .deepseek import DeepSeekProvider
from .ollama import OllamaProvider, LMStudioProvider

def get_provider(config: dict) -> BaseLLMProvider:
    """
    config приходит из .env или из UI настроек:
    {
      "provider": "anthropic",
      "api_key": "sk-ant-...",
      "model": "claude-sonnet-4-20250514",
      "base_url": ""   # опционально для кастомных эндпойнтов
    }
    """
    p = config.get("provider", "").lower()
    key = config.get("api_key", "")
    model = config.get("model", "")
    url = config.get("base_url", "")

    match p:
        case "anthropic":
            return AnthropicProvider(api_key=key, model=model or "claude-sonnet-4-20250514")
        case "openai":
            return OpenAIProvider(api_key=key, model=model or "gpt-4o")
        case "google" | "gemini":
            return GoogleProvider(api_key=key, model=model or "gemini-2.0-flash")
        case "xai" | "grok":
            return XAIProvider(api_key=key, model=model or "grok-3-mini")
        case "deepseek":
            return DeepSeekProvider(api_key=key, model=model or "deepseek-chat")
        case "ollama":
            return OllamaProvider(model=model or "llama3", base_url=url or "http://localhost:11434")
        case "lmstudio":
            return LMStudioProvider(model=model or "local-model", base_url=url or "http://localhost:1234")
        case _:
            raise ValueError(f"Неизвестный провайдер: {p}. Доступные: anthropic, openai, google, xai, deepseek, ollama, lmstudio")
```

### `.env.example`

```env
# Выбери один провайдер — остальные оставь пустыми

PROVIDER=anthropic
MODEL=claude-sonnet-4-20250514
API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=openai
# MODEL=gpt-4o
# API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=google
# MODEL=gemini-2.0-flash
# API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=xai
# MODEL=grok-3-mini
# API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=deepseek
# MODEL=deepseek-chat
# API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PROVIDER=ollama
# MODEL=llama3
# BASE_URL=http://localhost:11434

# PROVIDER=lmstudio
# MODEL=local-model
# BASE_URL=http://localhost:1234
```

---

## Блок 2 — Агент декомпозиции

**Цель:** принять текст от пользователя → вернуть JSON с деревом блоков и компонентов.

### Промпт

```python
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
```

### `backend/agents/decomposer.py`

```python
import json
from ..providers.base import BaseLLMProvider, Message

DECOMPOSE_SYSTEM = """..."""  # промпт выше
DECOMPOSE_USER = """..."""

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

    # Парсим JSON, зачищаем если модель добавила markdown
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Модель вернула невалидный JSON: {e}\n\nОтвет: {raw[:500]}")
```

---

## Блок 3 — Агент поиска компонентов

**Цель:** для каждого компонента найти где купить и реальную цену.

**Стратегия MVP:** веб-поиск через Tavily API (бесплатно 1000 запросов/месяц). В этапе 3 — DigiKey/Mouser API.

### `backend/agents/researcher.py`

```python
import os
from tavily import TavilyClient
from ..providers.base import BaseLLMProvider, Message

def search_component(component_name: str, spec: str, country: str = "global") -> dict:
    """Ищет компонент через Tavily и возвращает структурированный результат"""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

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

async def enrich_bom(
    provider: BaseLLMProvider,
    decomposition: dict,
    country: str = "global",
) -> dict:
    """Обогащает BOM реальными ценами и ссылками"""
    enriched_blocks = []

    for block in decomposition["blocks"]:
        enriched_components = []
        for comp in block["components"]:
            # Поиск компонента
            search_data = search_component(comp["name"], comp.get("spec", ""), country)

            # Просим LLM извлечь структурированные данные из результатов поиска
            extract_prompt = f"""
Из этих результатов поиска извлеки информацию о компоненте "{comp['name']}".
Результаты: {search_data['answer']}
{[r['url'] + ': ' + r['content'][:200] for r in search_data['search_results'][:3]]}

Ответь ТОЛЬКО JSON:
{{
  "found": true/false,
  "price_usd": 25.0,
  "shop_name": "GetFPV",
  "shop_url": "https://...",
  "alternatives": [
    {{"name": "...", "price_usd": 20.0, "url": "..."}}
  ]
}}
"""
            msg = [Message(role="user", content=extract_prompt)]
            resp = await provider.complete(msg, temperature=0.1, max_tokens=512)

            try:
                import json
                sourcing = json.loads(resp.content.strip().strip("```json").strip("```"))
            except Exception:
                sourcing = {"found": False}

            enriched_components.append({**comp, "sourcing": sourcing})

        enriched_blocks.append({**block, "components": enriched_components})

    return {**decomposition, "blocks": enriched_blocks}
```

---

## Блок 4 — Агент-писатель (лего-инструкция)

**Цель:** по дереву компонентов написать пошаговую инструкцию для новичка.

### Промпт

```python
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
```

### `backend/agents/writer.py`

```python
import json
from ..providers.base import BaseLLMProvider, Message

WRITER_SYSTEM = """..."""
WRITER_USER = """..."""

def _summarize_blocks(blocks: list) -> str:
    lines = []
    for block in blocks:
        lines.append(f"\n## {block['name']}: {block['purpose']}")
        for comp in block["components"]:
            lines.append(f"  - {comp['name']} ({comp.get('spec', '')}) × {comp['quantity']}")
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

    raw = response.content.strip().strip("```json").strip("```").strip()
    return json.loads(raw)
```

---

## Блок 5 — FastAPI backend

### `backend/api/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(title="HardwareBuilder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
```

### `backend/api/routes.py`

```python
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..providers.factory import get_provider
from ..agents.decomposer import decompose_device
from ..agents.researcher import enrich_bom
from ..agents.writer import generate_guide

router = APIRouter()

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
    # Берём конфиг из запроса (из UI) или из .env
    config = {
        "provider": req.provider or os.getenv("PROVIDER", ""),
        "api_key": req.api_key or os.getenv("API_KEY", ""),
        "model": req.model or os.getenv("MODEL", ""),
        "base_url": req.base_url or os.getenv("BASE_URL", ""),
    }

    if not config["provider"]:
        raise HTTPException(400, "Провайдер не выбран. Укажи в настройках или в .env")

    try:
        provider = get_provider(config)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Шаг 1: декомпозиция
    decomposition = await decompose_device(
        provider,
        req.description,
        budget=req.budget,
        skill_level=req.skill_level,
        country=req.country,
    )

    # Шаг 2: поиск компонентов (если есть Tavily ключ)
    if os.getenv("TAVILY_API_KEY"):
        decomposition = await enrich_bom(provider, decomposition, country=req.country)

    # Шаг 3: генерация инструкции
    guide = await generate_guide(provider, decomposition, skill_level=req.skill_level)

    return BuildResponse(decomposition=decomposition, guide=guide)

@router.get("/health")
def health():
    return {"status": "ok"}
```

---

## Блок 6 — Frontend (React + Vite)

### Структура компонентов

```
src/
├── pages/
│   ├── Home.tsx          # главная страница с поиском
│   └── Settings.tsx      # настройки модели
├── components/
│   ├── SearchBar.tsx     # поле ввода + кнопка
│   ├── StatCards.tsx     # 3 карточки: компоненты, бюджет, поставщики
│   ├── ComponentTree.tsx # дерево блоков
│   ├── BomTable.tsx      # таблица компонентов с ценами
│   └── LegoGuide.tsx     # пошаговая инструкция
├── store/
│   └── settings.ts       # zustand — конфиг модели
└── api/
    └── client.ts         # fetch к /build
```

### `src/store/settings.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  setSettings: (s: Partial<Settings>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      provider: '',
      apiKey: '',
      model: '',
      baseUrl: '',
      setSettings: (s) => set(s),
    }),
    { name: 'hw-settings' }  // сохраняется в localStorage
  )
)
```

### `src/api/client.ts`

```typescript
const BASE = 'http://localhost:8000'

export async function buildDevice(params: {
  description: string
  budget?: string
  skill_level?: string
  country?: string
  provider: string
  api_key: string
  model: string
  base_url?: string
}) {
  const res = await fetch(`${BASE}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Ошибка сервера')
  }
  return res.json()
}
```

### `src/pages/Settings.tsx` — выбор провайдера

```tsx
// Список всех поддерживаемых провайдеров
const PROVIDERS = [
  { id: 'anthropic', name: 'Claude (Anthropic)', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai',    name: 'GPT-4o (OpenAI)',    placeholder: 'sk-...',     defaultModel: 'gpt-4o' },
  { id: 'google',    name: 'Gemini (Google)',     placeholder: 'AIzaSy...', defaultModel: 'gemini-2.0-flash' },
  { id: 'xai',       name: 'Grok (xAI)',          placeholder: 'xai-...',   defaultModel: 'grok-3-mini' },
  { id: 'deepseek',  name: 'DeepSeek',            placeholder: 'sk-...',    defaultModel: 'deepseek-chat' },
  { id: 'ollama',    name: 'Ollama (локально)',   placeholder: '',          defaultModel: 'llama3', noKey: true },
  { id: 'lmstudio',  name: 'LM Studio (локально)',placeholder: '',          defaultModel: 'local-model', noKey: true },
]

// Компонент рендерит:
// 1. Сетку карточек провайдеров (как на мокапе)
// 2. При выборе — поля: Model name, API Key (если нужен), Base URL (для кастомных)
// 3. Кнопка "Проверить подключение" → GET /health с этим конфигом
// 4. Сохранение в zustand persist → localStorage
```

---

## Блок 7 — Docker

### `docker-compose.yml`

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./backend:/app
    command: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `backend/requirements.txt`

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

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]
```

---

## Порядок кодинга

1. **Сначала** — `providers/base.py` + `providers/factory.py` + тест в консоли  
   `python -c "import asyncio; from backend.providers.factory import get_provider; ..."`

2. **Потом** — `agents/decomposer.py` + протестить на 3 устройствах (дрон, холодильник, Arduino термостат)

3. **Потом** — `agents/writer.py` + проверить читаемость инструкции

4. **Потом** — `api/routes.py` + запустить FastAPI и потыкать через curl или Postman

5. **Потом** — Frontend: Settings страница → Home страница → компоненты

6. **Последним** — Docker + README с GIF

---

## Добавить нового провайдера (для контрибьюторов)

1. Создать `backend/providers/myprovider.py` наследующий `BaseLLMProvider`
2. Реализовать `complete()` и `is_available()`
3. Добавить case в `factory.py`
4. Добавить в список `PROVIDERS` в `Settings.tsx`
5. Написать в `.env.example` пример
6. PR готов
