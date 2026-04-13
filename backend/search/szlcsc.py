"""
SZLCSC (立创商城) — китайская версия LCSC.
Тот же владелец (JLC), но для внутреннего китайского рынка.
Ещё более низкие цены, доставка внутри Китая.

Endpoint: https://so.szlcsc.com/global.html (search API)
"""

import httpx

from .base import BaseSearchProvider, ComponentMatch

SZLCSC_SEARCH_URL = "https://so.szlcsc.com/global.html"


class SZLCSCProvider(BaseSearchProvider):
    """SZLCSC (立创商城) — китайский внутренний LCSC. Бесплатный."""

    @property
    def name(self) -> str:
        return "szlcsc"

    def is_available(self) -> bool:
        return True

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        query = f"{component_name} {spec}".strip()
        if not query:
            return ComponentMatch(found=False, source="szlcsc")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    SZLCSC_SEARCH_URL,
                    params={"k": query},
                    headers={
                        "User-Agent": "Brickify/1.0",
                        "Accept": "application/json",
                    },
                )

                if resp.status_code != 200:
                    return ComponentMatch(found=False, source="szlcsc")

                data = resp.json()
                products = data.get("ProductListVO", [])

                if not products:
                    return ComponentMatch(found=False, source="szlcsc")

                best = products[0]

                # Цена в CNY → конвертируем в USD (приблизительно)
                price_cny = best.get("ProductPrice", 0)
                price_usd = round(float(price_cny) / 7.2, 2) if price_cny else None

                product_url = f"https://www.szlcsc.com/product-detail/{best.get('ProductCode', '')}.html"

                return ComponentMatch(
                    found=True,
                    source="szlcsc",
                    price_usd=price_usd,
                    shop_name="SZLCSC",
                    shop_url=product_url,
                    manufacturer=best.get("BrandName", ""),
                    mpn=best.get("ProductModel", ""),
                    in_stock=best.get("StockNumber", 0) > 0,
                    alternatives=[],
                )

        except Exception:
            return ComponentMatch(found=False, source="szlcsc")
