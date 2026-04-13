"""
Octopart API — крупнейший агрегатор электронных компонентов.
Агрегирует DigiKey, Mouser, Arrow, Farnell, Newark и 50+ других.

API: https://octopart.com/api/v4
Бесплатный tier: 100 запросов/час.
Нужен API key: https://octopart.com/api/register
"""

import os
import asyncio

import httpx

from .base import BaseSearchProvider, ComponentMatch

OCTOPART_API_URL = "https://octopart.com/api/v4/endpoint"


class OctopartProvider(BaseSearchProvider):
    def __init__(self, api_key: str | None = None):
        self._key = api_key or os.getenv("OCTOPART_API_KEY", "")

    @property
    def name(self) -> str:
        return "octopart"

    def is_available(self) -> bool:
        return bool(self._key)

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self._key:
            return ComponentMatch(found=False, source="octopart")

        query = f"{component_name} {spec}".strip()

        # Octopart v4 использует GraphQL
        graphql_query = """
        query SearchParts($q: String!) {
            search(q: $q, limit: 5) {
                results {
                    part {
                        mpn
                        manufacturer {
                            name
                        }
                        best_offer {
                            prices {
                                price
                                currency
                                quantity
                            }
                            seller {
                                name
                            }
                            product_url
                            in_stock_quantity
                        }
                        short_description
                    }
                }
            }
        }
        """

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    OCTOPART_API_URL,
                    json={"query": graphql_query, "variables": {"q": query}},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self._key}",
                    },
                )

                if resp.status_code != 200:
                    return ComponentMatch(found=False, source="octopart")

                data = resp.json()
                results = (
                    data.get("data", {})
                    .get("search", {})
                    .get("results", [])
                )

                if not results:
                    return ComponentMatch(found=False, source="octopart")

                # Берём лучший результат
                best = results[0]["part"]
                offer = best.get("best_offer", {})
                prices = offer.get("prices", [])

                # Ищем USD цену
                price_usd = None
                for p in prices:
                    if p.get("currency") == "USD":
                        price_usd = float(p["price"])
                        break
                if price_usd is None and prices:
                    price_usd = float(prices[0].get("price", 0))

                seller = offer.get("seller", {})
                stock_qty = offer.get("in_stock_quantity")

                # Собираем альтернативы из остальных результатов
                alternatives = []
                for r in results[1:4]:
                    alt_part = r.get("part", {})
                    alt_offer = alt_part.get("best_offer", {})
                    alt_prices = alt_offer.get("prices", [])
                    alt_price = float(alt_prices[0]["price"]) if alt_prices else None
                    if alt_price:
                        alternatives.append({
                            "name": f"{alt_part.get('manufacturer', {}).get('name', '')} {alt_part.get('mpn', '')}".strip(),
                            "price_usd": alt_price,
                            "url": alt_offer.get("product_url", ""),
                        })

                return ComponentMatch(
                    found=True,
                    source="octopart",
                    price_usd=price_usd,
                    shop_name=seller.get("name", ""),
                    shop_url=offer.get("product_url", ""),
                    manufacturer=best.get("manufacturer", {}).get("name", ""),
                    mpn=best.get("mpn", ""),
                    in_stock=stock_qty is not None and stock_qty > 0,
                    alternatives=alternatives,
                )

        except Exception:
            return ComponentMatch(found=False, source="octopart")
