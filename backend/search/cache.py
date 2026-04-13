"""
In-memory кэш результатов поиска.
Живёт до перезапуска сервера. Предотвращает дублирование запросов
для одинаковых компонентов в рамках одного pipeline.
"""

import time
from dataclasses import dataclass

from .base import ComponentMatch


@dataclass
class CacheEntry:
    match: ComponentMatch
    timestamp: float


class SearchCache:
    """LRU-подобный кэш с TTL."""

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 500):
        self._cache: dict[str, CacheEntry] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size

    def _key(self, component_name: str, spec: str) -> str:
        return f"{component_name.lower().strip()}|{spec.lower().strip()}"

    def get(self, component_name: str, spec: str) -> ComponentMatch | None:
        key = self._key(component_name, spec)
        entry = self._cache.get(key)
        if entry is None:
            return None
        if time.time() - entry.timestamp > self._ttl:
            del self._cache[key]
            return None
        return entry.match

    def set(self, component_name: str, spec: str, match: ComponentMatch) -> None:
        # Evict oldest if full
        if len(self._cache) >= self._max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k].timestamp)
            del self._cache[oldest_key]

        key = self._key(component_name, spec)
        self._cache[key] = CacheEntry(match=match, timestamp=time.time())

    @property
    def size(self) -> int:
        return len(self._cache)
