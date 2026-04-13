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
