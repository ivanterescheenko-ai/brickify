# Contributing to Brickify

## Как помочь

### Новый LLM провайдер

1. Создай `backend/providers/yourprovider.py`, реализуй `BaseLLMProvider`
2. Добавь case в `backend/providers/factory.py`
3. Добавь в `PROVIDERS` в `frontend/src/pages/Settings.tsx`
4. Добавь пример в `.env.example`

Если провайдер OpenAI-совместимый — расширь `OpenAIProvider`, это 5 строк кода. Пример: `backend/providers/xai.py`.

### Баг-фикс

1. Открой issue с описанием бага
2. Форкни репо, создай ветку `fix/описание`
3. Исправь, проверь на 3 разных устройствах
4. Открой PR

### Новая фича

1. Открой issue с описанием фичи
2. Обсуди подход в issue перед написанием кода
3. Следуй существующей архитектуре

## Правила

- Промпты агентов живут в `backend/agents/`, не в `routes.py`
- Все денежные значения показываются как `$X.XX` моноширинным шрифтом
- **Никогда** не логируй тело запросов (может содержать API ключи)
- Тестируй с минимум 3 разными описаниями устройств перед PR
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`

## Запуск для разработки

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```
