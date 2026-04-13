"""
Researcher agent — обогащает BOM реальными ценами и ссылками.

Стратегия multi-source:
1. Octopart — для электронных компонентов (IC, resistors, capacitors, MCU, etc.)
2. Tavily — для всего остального (рамы, моторы, механика, батареи)
3. AI estimate — fallback из decomposer (estimated_price_usd)

Если источник вернул raw-данные (Tavily), LLM извлекает структурированную информацию.
Если источник вернул структурированные данные (Octopart), используем напрямую.
"""

from ..providers.base import BaseLLMProvider, Message
from ..search.base import ComponentMatch
from ..search.router import SearchRouter, create_search_router
from .utils import parse_llm_json


EXTRACT_PROMPT = """
From these search results, extract pricing info for component "{component_name}" ({spec}).

Search results:
{snippets}

Respond with ONLY JSON:
{{
  "price_usd": 25.0,
  "shop_name": "Amazon",
  "shop_url": "https://..."
}}

If you can't determine a reliable price, respond:
{{"price_usd": null, "shop_name": null, "shop_url": null}}
"""


async def _extract_price_from_tavily(
    provider: BaseLLMProvider,
    component_name: str,
    spec: str,
    match: ComponentMatch,
) -> dict:
    """Использует LLM для извлечения цены из Tavily search results."""
    snippets = "\n".join(
        f"- {alt.get('url', '')}: {alt.get('title', '')} — {alt.get('content', '')[:200]}"
        for alt in match.alternatives[:4]
    )

    if not snippets.strip():
        return {"found": False, "source": "tavily"}

    msg = [
        Message(
            role="user",
            content=EXTRACT_PROMPT.format(
                component_name=component_name,
                spec=spec,
                snippets=snippets,
            ),
        )
    ]

    try:
        resp = await provider.complete(msg, temperature=0.1, max_tokens=256)
        data = parse_llm_json(resp.content)
        return {
            "found": data.get("price_usd") is not None,
            "source": "tavily",
            "price_usd": data.get("price_usd"),
            "shop_name": data.get("shop_name"),
            "shop_url": data.get("shop_url"),
            "alternatives": [],
        }
    except (ValueError, Exception):
        return {"found": False, "source": "tavily"}


def _match_to_sourcing(match: ComponentMatch) -> dict:
    """Конвертирует ComponentMatch в dict для JSON response."""
    return {
        "found": match.found,
        "source": match.source,
        "price_usd": match.price_usd,
        "shop_name": match.shop_name,
        "shop_url": match.shop_url,
        "manufacturer": match.manufacturer,
        "mpn": match.mpn,
        "in_stock": match.in_stock,
        "alternatives": match.alternatives,
    }


async def enrich_bom(
    provider: BaseLLMProvider,
    decomposition: dict,
    country: str = "global",
    octopart_key: str | None = None,
    tavily_key: str | None = None,
) -> dict:
    """
    Обогащает BOM реальными ценами через multi-source search.

    Pipeline per component:
    1. SearchRouter ищет через Octopart → Tavily (по доступности)
    2. Если Octopart нашёл — используем структурированные данные напрямую
    3. Если Tavily нашёл — LLM извлекает цену из search results
    4. Если ничего не нашлось — оставляем estimated_price_usd из decomposer
    """
    router = create_search_router(
        octopart_key=octopart_key,
        tavily_key=tavily_key,
    )

    if not router.has_sources():
        return decomposition

    enriched_blocks = []

    for block in decomposition["blocks"]:
        enriched_components = []

        for comp in block["components"]:
            match = await router.search(
                comp["name"], comp.get("spec", ""), country
            )

            if match.found and match.source == "octopart":
                # Octopart вернул структурированные данные — используем напрямую
                sourcing = _match_to_sourcing(match)

            elif match.found and match.source == "tavily":
                # Tavily вернул raw results — LLM извлекает цену
                sourcing = await _extract_price_from_tavily(
                    provider, comp["name"], comp.get("spec", ""), match
                )

            else:
                # Ничего не нашлось
                sourcing = {"found": False, "source": "ai_estimate"}

            enriched_components.append({**comp, "sourcing": sourcing})

        enriched_blocks.append({**block, "components": enriched_components})

    return {**decomposition, "blocks": enriched_blocks}
