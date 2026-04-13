"""
Tavily API — generic web search.
Используется как fallback для не-электронных компонентов (рамы, моторы, механика).
Также используется когда Octopart не нашёл результат.

Бесплатно 1000 запросов/месяц.
"""

import os
import asyncio

from .base import BaseSearchProvider, ComponentMatch


# Шаблоны запросов по категории компонента
SEARCH_TEMPLATES = {
    "electronic": "buy {name} {spec} electronic component price shop",
    "mechanical": "buy {name} {spec} hardware store price",
    "motor": "buy {name} {spec} motor price shop online",
    "frame": "buy {name} {spec} frame kit price shop",
    "battery": "buy {name} {spec} battery pack price shop",
    "sensor": "buy {name} {spec} sensor module price shop",
    "default": "buy {name} {spec} price shop online",
}


class TavilySearchProvider(BaseSearchProvider):
    def __init__(self, api_key: str | None = None):
        self._key = api_key or os.getenv("TAVILY_API_KEY", "")

    @property
    def name(self) -> str:
        return "tavily"

    def is_available(self) -> bool:
        return bool(self._key)

    def _classify_component(self, name: str, spec: str) -> str:
        """Простая классификация компонента для выбора шаблона запроса."""
        text = f"{name} {spec}".lower()
        if any(w in text for w in ["motor", "мотор", "двигатель", "servo"]):
            return "motor"
        if any(w in text for w in ["frame", "рама", "chassis", "корпус", "enclosure"]):
            return "frame"
        if any(w in text for w in ["battery", "lipo", "аккумулятор", "li-ion", "18650"]):
            return "battery"
        if any(w in text for w in ["sensor", "датчик", "imu", "gyro", "baro", "gps"]):
            return "sensor"
        if any(w in text for w in ["resistor", "capacitor", "ic", "chip", "mcu", "stm32",
                                     "esp32", "arduino", "pcb", "connector", "led"]):
            return "electronic"
        if any(w in text for w in ["bolt", "screw", "nut", "washer", "bearing", "gear",
                                     "shaft", "rod", "bracket", "mount"]):
            return "mechanical"
        return "default"

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self._key:
            return ComponentMatch(found=False, source="tavily")

        try:
            from tavily import TavilyClient

            category = self._classify_component(component_name, spec)
            template = SEARCH_TEMPLATES.get(category, SEARCH_TEMPLATES["default"])
            query = template.format(name=component_name, spec=spec)

            if country.lower() not in ("global", "any", ""):
                query += f" {country}"

            client = TavilyClient(api_key=self._key)

            # Tavily sync — оборачиваем в thread
            result = await asyncio.to_thread(
                client.search,
                query=query,
                search_depth="basic",
                max_results=5,
                include_answer=True,
            )

            search_results = result.get("results", [])
            answer = result.get("answer", "")

            if not search_results and not answer:
                return ComponentMatch(found=False, source="tavily")

            return ComponentMatch(
                found=True,
                source="tavily",
                # Цену и магазин будет извлекать LLM в researcher.py
                # Здесь возвращаем raw данные через alternatives
                alternatives=[
                    {
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                        "content": r.get("content", "")[:300],
                    }
                    for r in search_results[:5]
                ],
            )

        except Exception:
            return ComponentMatch(found=False, source="tavily")
