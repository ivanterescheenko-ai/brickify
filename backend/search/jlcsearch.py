"""
jlcsearch (tscircuit) — бесплатный open source поиск компонентов JLCPCB/LCSC.
БЕЗ ключа, БЕЗ лимитов, структурированные данные.

API: добавь .json к любому URL на https://jlcsearch.tscircuit.com
Docs: https://docs.tscircuit.com/web-apis/jlcsearch-api
GitHub: https://github.com/tscircuit/jlcsearch

Покрывает: все компоненты доступные для JLCPCB assembly (резисторы, конденсаторы,
IC, MCU, транзисторы, LED, коннекторы и т.д.)
"""

import httpx

from .base import BaseSearchProvider, ComponentMatch

JLCSEARCH_BASE = "https://jlcsearch.tscircuit.com"


class JLCSearchProvider(BaseSearchProvider):
    """jlcsearch — бесплатный JLCPCB/LCSC component search. Без ключа."""

    @property
    def name(self) -> str:
        return "jlcpcb"

    def is_available(self) -> bool:
        return True  # Всегда доступен, без ключа

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        query = f"{component_name} {spec}".strip()
        if not query:
            return ComponentMatch(found=False, source="jlcpcb")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Используем generic search endpoint
                resp = await client.get(
                    f"{JLCSEARCH_BASE}/search.json",
                    params={"q": query},
                    headers={"User-Agent": "Brickify/1.0"},
                )

                if resp.status_code != 200:
                    # Fallback: попробуем через components listing
                    resp = await client.get(
                        f"{JLCSEARCH_BASE}/components/list.json",
                        params={"q": query},
                        headers={"User-Agent": "Brickify/1.0"},
                    )
                    if resp.status_code != 200:
                        return ComponentMatch(found=False, source="jlcpcb")

                data = resp.json()

                # jlcsearch возвращает массив компонентов
                components = data if isinstance(data, list) else data.get("components", data.get("results", []))

                if not components:
                    return ComponentMatch(found=False, source="jlcpcb")

                best = components[0]

                # Извлекаем данные — формат зависит от endpoint
                lcsc_number = best.get("lcsc", best.get("lcsc_number", best.get("part_number", "")))
                price = best.get("price", best.get("unit_price"))
                if price is not None:
                    price = float(price)

                stock = best.get("stock", best.get("in_stock", 0))
                manufacturer = best.get("manufacturer", best.get("mfr", ""))
                mpn = best.get("mpn", best.get("manufacturer_part_number", best.get("mfr_part", "")))
                description = best.get("description", "")

                product_url = f"https://jlcpcb.com/partdetail/{lcsc_number}" if lcsc_number else ""

                # Альтернативы
                alternatives = []
                for alt in components[1:4]:
                    alt_price = alt.get("price", alt.get("unit_price"))
                    alt_lcsc = alt.get("lcsc", alt.get("lcsc_number", ""))
                    if alt_price:
                        alternatives.append({
                            "name": f"{alt.get('manufacturer', '')} {alt.get('mpn', alt.get('mfr_part', ''))}".strip(),
                            "price_usd": float(alt_price),
                            "url": f"https://jlcpcb.com/partdetail/{alt_lcsc}" if alt_lcsc else "",
                        })

                return ComponentMatch(
                    found=True,
                    source="jlcpcb",
                    price_usd=price,
                    shop_name="JLCPCB",
                    shop_url=product_url,
                    manufacturer=manufacturer,
                    mpn=mpn or lcsc_number,
                    in_stock=int(stock) > 0 if stock else None,
                    alternatives=alternatives,
                )

        except Exception:
            return ComponentMatch(found=False, source="jlcpcb")
