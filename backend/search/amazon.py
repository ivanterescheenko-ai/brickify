"""
Amazon search — через Tavily с site-scoped запросами.
Не требует отдельного API ключа — использует Tavily.
Быстрая доставка, широкий ассортимент.
"""

import os
import asyncio

from .base import BaseSearchProvider, ComponentMatch


class AmazonSearchProvider(BaseSearchProvider):
    def __init__(self, tavily_key: str | None = None):
        self._key = tavily_key or os.getenv("TAVILY_API_KEY", "")

    @property
    def name(self) -> str:
        return "amazon"

    def is_available(self) -> bool:
        return bool(self._key)

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self._key:
            return ComponentMatch(found=False, source="amazon")

        try:
            from tavily import TavilyClient

            # Site-scoped запрос к Amazon
            domain = "amazon.com"
            if country.lower() in ("de", "germany"):
                domain = "amazon.de"
            elif country.lower() in ("uk", "gb", "britain"):
                domain = "amazon.co.uk"
            elif country.lower() in ("jp", "japan"):
                domain = "amazon.co.jp"

            query = f"site:{domain} {component_name} {spec}"

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
                return ComponentMatch(found=False, source="amazon")

            return ComponentMatch(
                found=True,
                source="amazon",
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
            return ComponentMatch(found=False, source="amazon")
