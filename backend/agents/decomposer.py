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
