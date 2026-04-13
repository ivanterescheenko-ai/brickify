from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ComponentMatch:
    """Результат поиска одного компонента."""
    found: bool
    source: str  # "octopart" | "tavily" | "ai_estimate"
    price_usd: float | None = None
    shop_name: str | None = None
    shop_url: str | None = None
    manufacturer: str | None = None
    mpn: str | None = None  # manufacturer part number
    in_stock: bool | None = None
    alternatives: list[dict] = field(default_factory=list)


class BaseSearchProvider(ABC):
    """Базовый интерфейс для поиска компонентов."""

    @abstractmethod
    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...
