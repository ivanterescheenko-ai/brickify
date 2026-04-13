# Brickify — context for Claude Code

## What is this?

Open source tool: user describes what they want to build → AI decomposes the device into blocks and components → finds where to buy each part → generates a step-by-step assembly guide (Lego-style, for non-technical people).

Free, MIT license. Users bring their own LLM API key (Claude, GPT, Gemini, Grok, DeepSeek, Ollama, LM Studio — all supported).

## Stack overrides (vs global CLAUDE.md)

> Этот проект отклоняется от глобального стека в следующем:

- **Нет БД** — результаты возвращаются напрямую, без персистенции (MVP)
- **Нет Pydantic Settings** — конфигурация через `.env` + `os.getenv()` напрямую
- **Python 3.12**, Node 20 LTS — версии зафиксированы для Docker
- **Нет mypy strict в MVP** — type hints пишем, но strict mode не блокирует

## Project status

> **Код ещё не создан.** Существуют только документы планирования. Структура ниже — планируемая.

## Repo structure (planned)

```
brickify/
├── backend/
│   ├── providers/      # LLM adapters (one per model provider)
│   ├── agents/         # decomposer, researcher, writer
│   ├── api/            # FastAPI routes
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/           # React + Vite
│   ├── src/
│   │   ├── pages/      # Home, Settings
│   │   └── components/ # ComponentTree, BomTable, LegoGuide, StatCards
│   ├── Dockerfile
│   └── package.json
├── HARDWAREBUILDER_PLAN.md    # full technical implementation plan
├── HARDWAREBUILDER_DESIGN.md  # full design system (fonts, colors, components)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Read these first

Before writing any code, read both documents in this order:

1. `HARDWAREBUILDER_PLAN.md` — all code, prompts, API routes, folder structure
2. `HARDWAREBUILDER_DESIGN.md` — design system, CSS variables, component styles

Everything is already decided. Don't invent new structure — follow the plan.

## Build order

**Start here, go in this exact order:**

1. Create folder structure (backend + frontend skeleton)
2. `backend/providers/` — base.py → all adapters → factory.py
3. `backend/agents/` — decomposer.py → writer.py → researcher.py
4. `backend/api/` — main.py → routes.py
5. `frontend/` — Settings page → Home page → components
6. `docker-compose.yml` + both Dockerfiles
7. `README.md` with install instructions

After each block: run a quick test before moving to the next.

## Key decisions (don't change these)

- **Single LLM interface** — all providers implement `BaseLLMProvider` with one `complete()` method. The rest of the code never calls provider-specific APIs directly.
- **factory.py** reads provider config and returns the right adapter. Config comes from `.env` OR from the frontend Settings page (sent in the request body).
- **No database in MVP** — results are returned directly, not stored. No SQLite, no Postgres.
- **No streaming in MVP** — полный ответ, не SSE. Осознанное решение для упрощения. Streaming — post-MVP.
- **Tavily API** for component search (optional — works without it, just skips price lookup).
- **Docker-first** — `docker compose up` must work out of the box. This is how 90% of users will install it.

## LLM providers supported

| Provider | env var | default model | notes |
|---|---|---|---|
| Anthropic (Claude) | `API_KEY` | `claude-sonnet-4-20250514` | основной провайдер |
| OpenAI (GPT) | `API_KEY` | `gpt-4.1` | `o3` / `o4-mini` для reasoning |
| Google (Gemini) | `API_KEY` | `gemini-2.5-flash` | `gemini-2.5-pro` для сложных |
| xAI (Grok) | `API_KEY` | `grok-3` | OpenAI-compatible API |
| DeepSeek | `API_KEY` | `deepseek-r1` | `deepseek-v3` для быстрых |
| Ollama | no key | `llama4-scout` | local |
| LM Studio | no key | любая GGUF | local, OpenAI-compatible |

Grok, DeepSeek, Ollama, LM Studio all reuse the OpenAI adapter with a different `base_url`. Don't write separate HTTP logic for them.

> **Принцип:** используем последнюю стабильную модель провайдера. Таблица выше — snapshot на апрель 2026. При добавлении нового провайдера — проверить актуальные модели.

## Testing strategy

| Слой | Инструмент | Что тестируем |
|---|---|---|
| Backend providers | `pytest` + `pytest-asyncio` | `complete()` возвращает валидный `LLMResponse`, обработка ошибок API |
| Backend agents | `pytest` | JSON парсинг, обработка markdown fences, edge cases |
| Backend API | `pytest` + `httpx.AsyncClient` | Routes возвращают правильные status codes и JSON schema |
| Frontend | `vitest` + `@testing-library/react` | Компоненты рендерятся, формы отправляются |
| E2E (post-MVP) | `playwright` | Полный флоу от ввода до результата |

**Минимум для merge:** backend unit tests проходят, фронтенд собирается без ошибок (`npm run build`).

## Error handling

| Ситуация | Backend response | Frontend поведение |
|---|---|---|
| LLM вернул невалидный JSON | HTTP 422 + `{"error": "llm_parse_error", "detail": "..."}` | Показать «Попробуйте ещё раз» |
| LLM timeout (>60 сек) | HTTP 504 + `{"error": "llm_timeout"}` | Показать «Модель не ответила» |
| API key невалидный | HTTP 401 + `{"error": "auth_error", "provider": "..."}` | Redirect на Settings |
| Tavily недоступен | Пропустить price lookup, вернуть `estimated_price_usd` из decomposer | Показать estimated prices с пометкой |
| Неизвестный provider | HTTP 400 + `{"error": "unknown_provider"}` | Dropdown не даёт выбрать |

**Формат ошибок (всегда):**
```json
{"error": "error_code", "detail": "human-readable описание"}
```

## CORS & Security

- CORS: в dev — `localhost:5173` (Vite), в prod — настраивается через `ALLOWED_ORIGINS` env var
- API ключи передаются в request body — **логирование запросов НЕ должно включать body**
- Middleware логирования: логировать method + path + status + duration, НЕ payload
- Rate limiting: не в MVP, но оставить место для middleware

## Timeouts

| Вызов | Timeout |
|---|---|
| LLM `complete()` | 60 секунд |
| Tavily search | 10 секунд |
| Весь pipeline (decompose + research + write) | 180 секунд |

## Tavily fallback

Когда Tavily недоступен или `TAVILY_API_KEY` не задан:
- Researcher agent **пропускает** поиск цен и магазинов
- Используются `estimated_price_usd` из decomposer (AI-оценка)
- Фронтенд показывает цены с пометкой «оценка AI» (не «актуальная цена»)
- Ссылки на магазины не показываются

## Docker

| Компонент | Base image | Порт |
|---|---|---|
| Backend | `python:3.12-slim` | 8000 |
| Frontend | `node:20-alpine` → nginx (multi-stage) | 3000 |

## Design system (short version)

Full details in `HARDWAREBUILDER_DESIGN.md`. Key points:

- **Dark theme** is default (`--bg-base: #0D0E11`)
- **Fonts:** Syne (headings) + IBM Plex Sans (body) + IBM Plex Mono (all numbers/prices/specs)
- **Accent color:** `#3B82F6` (electric blue)
- **All prices and quantities** must use `font-family: var(--font-mono)`
- **Animations:** fadeUp on BOM rows (staggered), pulse skeleton while loading
- **Background:** subtle grid pattern (see DESIGN.md for CSS)

## Agent prompts (summary)

All full prompts are in `HARDWAREBUILDER_PLAN.md`. Short version:

**Decomposer** — takes device description, returns JSON tree:
```json
{
  "device": "FPV Racing Drone 5\"",
  "blocks": [
    {
      "name": "Frame",
      "components": [
        { "name": "Carbon frame 5\"", "spec": "3K carbon", "quantity": 1, "estimated_price_usd": 28 }
      ]
    }
  ]
}
```

**Writer** — takes decomposition JSON, returns step-by-step guide:
```json
{
  "steps": [
    { "number": 1, "title": "Assemble the frame", "what_to_do": "...", "tip": "...", "time_minutes": 10 }
  ]
}
```

Always parse JSON responses defensively — strip markdown fences before `json.loads()`.

## How to run locally (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env
# edit .env with your API key
uvicorn api.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Environment variables

```env
PROVIDER=anthropic          # anthropic | openai | google | xai | deepseek | ollama | lmstudio
API_KEY=sk-ant-xxx          # leave empty for ollama/lmstudio
MODEL=claude-sonnet-4-20250514
BASE_URL=                   # only for ollama/lmstudio or custom endpoints
TAVILY_API_KEY=             # optional, for component price search
ALLOWED_ORIGINS=http://localhost:5173  # CORS, comma-separated
```

## What "done" looks like

MVP is complete when:
- User types "I want to build an FPV drone" → gets component tree + BOM with prices + assembly guide
- Works with at least Claude, OpenAI, and Ollama
- `docker compose up` starts everything with no errors
- Settings page lets user switch provider and paste API key
- No crashes on bad LLM output (JSON parse errors handled gracefully)
- Backend tests pass (`pytest`), frontend builds (`npm run build`)

## Notes for contributors (if others open PRs)

- Adding a new LLM provider = create `backend/providers/newprovider.py` + add case in `factory.py` + add to `PROVIDERS` list in `frontend/src/pages/Settings.tsx`
- Keep prompts in `agents/` files, not in `routes.py`
- All monetary values displayed as `$X.XX` using monospace font
- Test with at least 3 different device descriptions before merging
- Never log request bodies (may contain API keys)
