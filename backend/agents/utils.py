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
