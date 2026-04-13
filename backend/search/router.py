"""
Multi-source search router.

Цепочка поиска:
1. Octopart — электронные компоненты (DigiKey, Mouser, Arrow, Farnell)
2. Tavily — generic web search (моторы, рамы, механика)
3. Amazon — site-scoped search (быстрая доставка)
4. LCSC — китайский дистрибьютор (JLC PCB, бесплатный API)
5. AliExpress — site-scoped search (низкие цены)
6. SZLCSC (立创商城) — внутренний китайский LCSC
7. AI estimate — fallback из decomposer

Результаты кэшируются (in-memory, TTL 1 час).
Компоненты внутри одного BOM ищутся параллельно (asyncio.gather).
"""

import asyncio
import os

from .aliexpress import AliExpressSearchProvider
from .amazon import AmazonSearchProvider
from .base import BaseSearchProvider, ComponentMatch
from .cache import SearchCache
from .lcsc import LCSCProvider
from .octopart import OctopartProvider
from .szlcsc import SZLCSCProvider
from .tavily_search import TavilySearchProvider


class SearchRouter:
    """Роутер поиска компонентов с fallback chain и кэшем."""

    def __init__(
        self,
        octopart_key: str | None = None,
        tavily_key: str | None = None,
    ):
        self._providers: list[BaseSearchProvider] = []
        self._cache = SearchCache(ttl_seconds=3600, max_size=500)

        # Octopart — приоритет для электроники
        octopart = OctopartProvider(api_key=octopart_key)
        if octopart.is_available():
            self._providers.append(octopart)

        # Tavily — generic web search
        tavily = TavilySearchProvider(api_key=tavily_key)
        if tavily.is_available():
            self._providers.append(tavily)

        # Amazon — через Tavily, site-scoped
        amazon = AmazonSearchProvider(tavily_key=tavily_key)
        if amazon.is_available():
            self._providers.append(amazon)

        # LCSC — китайский дистрибьютор, бесплатный API
        self._providers.append(LCSCProvider())

        # AliExpress — через Tavily, site-scoped
        aliexpress = AliExpressSearchProvider(tavily_key=tavily_key)
        if aliexpress.is_available():
            self._providers.append(aliexpress)

        # SZLCSC — внутренний китайский LCSC (ещё дешевле)
        self._providers.append(SZLCSCProvider())

    @property
    def available_sources(self) -> list[str]:
        return [p.name for p in self._providers]

    def has_sources(self) -> bool:
        return len(self._providers) > 0

    def _get_provider_order(self, category: str) -> list[BaseSearchProvider]:
        """
        Оптимизирует порядок провайдеров по категории компонента.
        electronic → Octopart/LCSC first (structured data)
        mechanical/frame → Tavily/Amazon first (web search better)
        wiring/fastener → AliExpress/LCSC first (cheapest)
        """
        by_name = {p.name: p for p in self._providers}

        if category in ("electronic",):
            priority = ["octopart", "lcsc", "szlcsc", "tavily", "amazon", "aliexpress"]
        elif category in ("mechanical", "frame"):
            priority = ["tavily", "amazon", "aliexpress", "lcsc", "octopart", "szlcsc"]
        elif category in ("wiring", "fastener", "consumable"):
            priority = ["aliexpress", "lcsc", "amazon", "tavily", "szlcsc", "octopart"]
        else:
            priority = ["octopart", "tavily", "amazon", "lcsc", "aliexpress", "szlcsc"]

        ordered = [by_name[n] for n in priority if n in by_name]
        # Add any remaining providers not in priority list
        remaining = [p for p in self._providers if p.name not in {n for n in priority}]
        return ordered + remaining

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
        category: str = "",
    ) -> ComponentMatch:
        """
        Ищет компонент через доступные источники.
        Порядок оптимизирован по категории компонента.
        """
        cached = self._cache.get(component_name, spec)
        if cached is not None:
            return cached

        providers = self._get_provider_order(category) if category else self._providers

        for provider in providers:
            result = await provider.search(component_name, spec, country)
            if result.found:
                self._cache.set(component_name, spec, result)
                return result

        not_found = ComponentMatch(found=False, source="none")
        self._cache.set(component_name, spec, not_found)
        return not_found

    async def search_batch(
        self,
        components: list[dict],
        country: str = "global",
        max_concurrent: int = 5,
    ) -> list[ComponentMatch]:
        """
        Параллельный поиск нескольких компонентов.
        Ограничен semaphore для предотвращения rate limiting.
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def _search_one(comp: dict) -> ComponentMatch:
            async with semaphore:
                return await self.search(
                    comp.get("name", ""),
                    comp.get("spec", ""),
                    country,
                    category=comp.get("category", ""),
                )

        return await asyncio.gather(*[_search_one(c) for c in components])


def create_search_router(
    octopart_key: str | None = None,
    tavily_key: str | None = None,
) -> SearchRouter:
    """Фабрика для создания роутера из .env или переданных ключей."""
    return SearchRouter(
        octopart_key=octopart_key or os.getenv("OCTOPART_API_KEY", ""),
        tavily_key=tavily_key or os.getenv("TAVILY_API_KEY", ""),
    )
