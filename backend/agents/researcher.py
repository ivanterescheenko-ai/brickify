"""
Researcher agent — обогащает BOM реальными ценами и ссылками.

Стратегия multi-source:
1. Octopart — для электронных компонентов (IC, resistors, capacitors, MCU, etc.)
2. Tavily — для всего остального (рамы, моторы, механика, батареи)
3. Amazon — site-scoped search (быстрая доставка)
4. AliExpress — site-scoped search (низкие цены)
5. AI estimate — fallback из decomposer (estimated_price_usd)

Компоненты внутри блока ищутся параллельно.
Результаты кэшируются (in-memory, TTL 1 час).
"""

import asyncio

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


async def _enrich_component(
    provider: BaseLLMProvider,
    router: SearchRouter,
    comp: dict,
    country: str,
) -> dict:
    """Обогащает один компонент через search router + LLM extraction."""
    match = await router.search(comp["name"], comp.get("spec", ""), country)

    # Структурированные источники — используем напрямую
    if match.found and match.source in ("octopart", "lcsc", "szlcsc"):
        sourcing = _match_to_sourcing(match)
    # Raw search results — LLM извлекает цену
    elif match.found and match.source in ("tavily", "amazon", "aliexpress"):
        sourcing = await _extract_price_from_tavily(
            provider, comp["name"], comp.get("spec", ""), match
        )
        sourcing["source"] = match.source
    else:
        sourcing = {"found": False, "source": "ai_estimate"}

    return {**comp, "sourcing": sourcing}


async def enrich_bom(
    provider: BaseLLMProvider,
    decomposition: dict,
    country: str = "global",
    octopart_key: str | None = None,
    tavily_key: str | None = None,
) -> dict:
    """
    Обогащает BOM реальными ценами через multi-source search.

    Источники (по приоритету):
    1. Octopart — электронные компоненты (структурированные данные)
    2. Tavily — generic web search (LLM извлекает цену)
    3. Amazon — site-scoped search (LLM извлекает цену)
    4. AliExpress — site-scoped search (LLM извлекает цену)
    5. AI estimate — fallback из decomposer

    Компоненты внутри блока ищутся параллельно (до 5 одновременно).
    Результаты кэшируются (in-memory, TTL 1 час).
    """
    router = create_search_router(
        octopart_key=octopart_key,
        tavily_key=tavily_key,
    )

    if not router.has_sources():
        return decomposition

    enriched_blocks = []

    for block in decomposition["blocks"]:
        # Параллельный поиск всех компонентов блока
        tasks = [
            _enrich_component(provider, router, comp, country)
            for comp in block["components"]
        ]
        enriched_components = await asyncio.gather(*tasks)
        enriched_blocks.append({**block, "components": list(enriched_components)})

    return {**decomposition, "blocks": enriched_blocks}
