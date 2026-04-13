"""
Multi-source search router.
Выбирает источник в зависимости от типа компонента и доступности API.

Цепочка: Octopart (электроника) → Tavily (всё остальное) → AI estimate (fallback)
"""

import os

from .base import BaseSearchProvider, ComponentMatch
from .octopart import OctopartProvider
from .tavily_search import TavilySearchProvider


class SearchRouter:
    """Роутер поиска компонентов с fallback chain."""

    def __init__(
        self,
        octopart_key: str | None = None,
        tavily_key: str | None = None,
    ):
        self._providers: list[BaseSearchProvider] = []

        # Octopart — приоритет для электроники
        octopart = OctopartProvider(api_key=octopart_key)
        if octopart.is_available():
            self._providers.append(octopart)

        # Tavily — универсальный fallback
        tavily = TavilySearchProvider(api_key=tavily_key)
        if tavily.is_available():
            self._providers.append(tavily)

    @property
    def available_sources(self) -> list[str]:
        return [p.name for p in self._providers]

    def has_sources(self) -> bool:
        return len(self._providers) > 0

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        """
        Ищет компонент через доступные источники.
        Возвращает первый успешный результат.
        """
        for provider in self._providers:
            result = await provider.search(component_name, spec, country)
            if result.found:
                return result

        # Ничего не найдено
        return ComponentMatch(found=False, source="none")


def create_search_router(
    octopart_key: str | None = None,
    tavily_key: str | None = None,
) -> SearchRouter:
    """Фабрика для создания роутера из .env или переданных ключей."""
    return SearchRouter(
        octopart_key=octopart_key or os.getenv("OCTOPART_API_KEY", ""),
        tavily_key=tavily_key or os.getenv("TAVILY_API_KEY", ""),
    )
