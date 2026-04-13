"""
AliExpress search — через Tavily с site-scoped запросами.
Самые низкие цены, длинная доставка.
"""

import os
import asyncio

from .base import BaseSearchProvider, ComponentMatch


class AliExpressSearchProvider(BaseSearchProvider):
    def __init__(self, tavily_key: str | None = None):
        self._key = tavily_key or os.getenv("TAVILY_API_KEY", "")

    @property
    def name(self) -> str:
        return "aliexpress"

    def is_available(self) -> bool:
        return bool(self._key)

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self._key:
            return ComponentMatch(found=False, source="aliexpress")

        try:
            from tavily import TavilyClient

            query = f"site:aliexpress.com {component_name} {spec}"

            client = TavilyClient(api_key=self._key)
            result = await asyncio.to_thread(
                client.search,
                query=query,
                search_depth="basic",
                max_results=3,
                include_answer=False,
            )

            search_results = result.get("results", [])
            if not search_results:
                return ComponentMatch(found=False, source="aliexpress")

            return ComponentMatch(
                found=True,
                source="aliexpress",
                alternatives=[
                    {
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                        "content": r.get("content", "")[:300],
                    }
                    for r in search_results[:3]
                ],
            )

        except Exception:
            return ComponentMatch(found=False, source="aliexpress")
