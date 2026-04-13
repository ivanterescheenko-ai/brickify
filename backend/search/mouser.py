"""
Mouser Electronics API — прямой REST API.
Проще DigiKey (API key вместо OAuth).

Endpoint: https://api.mouser.com/api/v2/search/keyword
Auth: API key в query parameter
Free: регистрация бесплатна, лимиты не публикуются
Docs: https://api.mouser.com/api/docs/ui/index
"""

import os

import httpx

from .base import BaseSearchProvider, ComponentMatch

MOUSER_SEARCH_URL = "https://api.mouser.com/api/v2/search/keyword"


class MouserProvider(BaseSearchProvider):
    """Mouser Electronics — REST API с API key."""

    def __init__(self, api_key: str | None = None):
        self._key = api_key or os.getenv("MOUSER_API_KEY", "")

    @property
    def name(self) -> str:
        return "mouser"

    def is_available(self) -> bool:
        return bool(self._key)

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self._key:
            return ComponentMatch(found=False, source="mouser")

        query = f"{component_name} {spec}".strip()

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{MOUSER_SEARCH_URL}?apiKey={self._key}",
                    json={
                        "SearchByKeywordRequest": {
                            "keyword": query,
                            "records": 5,
                            "startingRecord": 0,
                            "searchOptions": "None",
                            "searchWithYourSignUpLanguage": "false",
                        }
                    },
                    headers={"Content-Type": "application/json"},
                )

                if resp.status_code != 200:
                    return ComponentMatch(found=False, source="mouser")

                data = resp.json()
                parts = (
                    data.get("SearchResults", {})
                    .get("Parts", [])
                )

                if not parts:
                    return ComponentMatch(found=False, source="mouser")

                best = parts[0]

                # Цена — берём первый price break
                price_usd = None
                price_breaks = best.get("PriceBreaks", [])
                if price_breaks:
                    raw_price = price_breaks[0].get("Price", "0")
                    # Mouser возвращает "$1.23" или "1.23"
                    clean = raw_price.replace("$", "").replace(",", ".").strip()
                    try:
                        price_usd = float(clean)
                    except ValueError:
                        pass

                availability = best.get("Availability", "0")
                try:
                    stock_qty = int(availability.split()[0].replace(",", ""))
                except (ValueError, IndexError):
                    stock_qty = 0

                product_url = best.get("ProductDetailUrl", "")
                manufacturer = best.get("Manufacturer", "")
                mpn = best.get("ManufacturerPartNumber", "")

                # Альтернативы
                alternatives = []
                for alt in parts[1:4]:
                    alt_prices = alt.get("PriceBreaks", [])
                    alt_price = None
                    if alt_prices:
                        try:
                            alt_price = float(alt_prices[0].get("Price", "0").replace("$", "").replace(",", "."))
                        except ValueError:
                            pass
                    if alt_price:
                        alternatives.append({
                            "name": f"{alt.get('Manufacturer', '')} {alt.get('ManufacturerPartNumber', '')}".strip(),
                            "price_usd": alt_price,
                            "url": alt.get("ProductDetailUrl", ""),
                        })

                return ComponentMatch(
                    found=True,
                    source="mouser",
                    price_usd=price_usd,
                    shop_name="Mouser",
                    shop_url=product_url,
                    manufacturer=manufacturer,
                    mpn=mpn,
                    in_stock=stock_qty > 0,
                    alternatives=alternatives,
                )

        except Exception:
            return ComponentMatch(found=False, source="mouser")
