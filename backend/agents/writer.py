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
