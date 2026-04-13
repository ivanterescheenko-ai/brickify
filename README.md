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
