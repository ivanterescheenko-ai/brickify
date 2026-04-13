"""
LCSC (Shenzhen LCSC Electronics) — крупнейший китайский дистрибьютор компонентов.
Владелец JLC PCB. Очень низкие цены, доставка из Китая.

Использует внутренний API LCSC (не требует ключа).
Endpoint: https://wmsc.lcsc.com/ftps/wm/product/search
"""

import httpx

from .base import BaseSearchProvider, ComponentMatch


LCSC_SEARCH_URL = "https://wmsc.lcsc.com/ftps/wm/product/search"


class LCSCProvider(BaseSearchProvider):
    """LCSC component search — бесплатный, без API ключа."""

    @property
    def name(self) -> str:
        return "lcsc"

    def is_available(self) -> bool:
        return True  # Всегда доступен, не требует ключа

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        query = f"{component_name} {spec}".strip()
        if not query:
            return ComponentMatch(found=False, source="lcsc")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    LCSC_SEARCH_URL,
                    json={
                        "keyword": query,
                        "limit": 5,
                        "currentPage": 1,
                    },
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "Brickify/1.0",
                    },
                )

                if resp.status_code != 200:
                    return ComponentMatch(found=False, source="lcsc")

                data = resp.json()
                products = data.get("result", {}).get("tipProductDetailUrlVO", [])

                if not products:
                    # Альтернативная структура ответа
                    products = data.get("result", {}).get("productSearchResultVO", [])

                if not products:
                    return ComponentMatch(found=False, source="lcsc")

                best = products[0]

                # Извлекаем цену — LCSC возвращает price breaks
                price_usd = None
                price_list = best.get("productPriceList", [])
                if price_list:
                    # Берём цену за 1 шт (первый price break)
                    price_usd = price_list[0].get("productPrice")
                    if price_usd:
                        price_usd = float(price_usd)

                # Формируем URL продукта
                product_code = best.get("productCode", "")
                product_url = f"https://www.lcsc.com/product-detail/{product_code}.html" if product_code else ""

                # Альтернативы
                alternatives = []
                for p in products[1:4]:
                    alt_price = None
                    alt_prices = p.get("productPriceList", [])
                    if alt_prices:
                        alt_price = alt_prices[0].get("productPrice")
                        if alt_price:
                            alt_price = float(alt_price)
                    alt_code = p.get("productCode", "")
                    alternatives.append({
                        "name": f"{p.get('brandNameEn', '')} {p.get('productModel', '')}".strip(),
                        "price_usd": alt_price,
                        "url": f"https://www.lcsc.com/product-detail/{alt_code}.html" if alt_code else "",
                    })

                return ComponentMatch(
                    found=True,
                    source="lcsc",
                    price_usd=price_usd,
                    shop_name="LCSC",
                    shop_url=product_url,
                    manufacturer=best.get("brandNameEn", ""),
                    mpn=best.get("productModel", ""),
                    in_stock=best.get("stockNumber", 0) > 0,
                    alternatives=alternatives,
                )

        except Exception:
            return ComponentMatch(found=False, source="lcsc")
