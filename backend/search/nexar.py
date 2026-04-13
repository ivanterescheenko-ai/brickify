"""
Nexar API (бывший Octopart) — крупнейший агрегатор электронных компонентов.
Агрегирует DigiKey, Mouser, Arrow, Farnell, Newark и 50+ дистрибьюторов.

API: GraphQL https://api.nexar.com/graphql
Auth: OAuth 2.0 (client_id + client_secret → access token)
Free tier: 100 matched parts/месяц (Evaluation plan)
Docs: https://docs.nexar.com
Portal: https://portal.nexar.com

ВАЖНО: Octopart REST API v4 deprecated. Используем Nexar GraphQL.
"""

import os

import httpx

from .base import BaseSearchProvider, ComponentMatch

NEXAR_TOKEN_URL = "https://identity.nexar.com/connect/token"
NEXAR_GRAPHQL_URL = "https://api.nexar.com/graphql"

# GraphQL query для поиска компонентов
SEARCH_QUERY = """
query SearchParts($q: String!, $limit: Int!) {
  supSearch(q: $q, limit: $limit) {
    results {
      part {
        mpn
        manufacturer {
          name
        }
        shortDescription
        bestOffer {
          prices {
            price
            currency
            quantity
          }
          seller {
            name
          }
          clickUrl
          inventoryLevel
        }
        bestDatasheet {
          url
        }
        specs {
          attribute {
            name
          }
          displayValue
        }
      }
    }
  }
}
"""


class NexarProvider(BaseSearchProvider):
    """Nexar (Octopart) — GraphQL API, 50+ дистрибьюторов."""

    def __init__(self, client_id: str | None = None, client_secret: str | None = None):
        self._client_id = client_id or os.getenv("NEXAR_CLIENT_ID", "")
        self._client_secret = client_secret or os.getenv("NEXAR_CLIENT_SECRET", "")
        self._access_token: str | None = None

    @property
    def name(self) -> str:
        return "nexar"

    def is_available(self) -> bool:
        return bool(self._client_id and self._client_secret)

    async def _get_token(self) -> str | None:
        """OAuth 2.0 client credentials → access token."""
        if self._access_token:
            return self._access_token

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    NEXAR_TOKEN_URL,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                    },
                )
                if resp.status_code == 200:
                    self._access_token = resp.json().get("access_token")
                    return self._access_token
        except Exception:
            pass
        return None

    async def search(
        self,
        component_name: str,
        spec: str,
        country: str = "global",
    ) -> ComponentMatch:
        if not self.is_available():
            return ComponentMatch(found=False, source="nexar")

        token = await self._get_token()
        if not token:
            return ComponentMatch(found=False, source="nexar")

        query = f"{component_name} {spec}".strip()

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    NEXAR_GRAPHQL_URL,
                    json={
                        "query": SEARCH_QUERY,
                        "variables": {"q": query, "limit": 5},
                    },
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                if resp.status_code != 200:
                    # Token expired? Reset and retry
                    if resp.status_code == 401:
                        self._access_token = None
                    return ComponentMatch(found=False, source="nexar")

                data = resp.json()
                results = (
                    data.get("data", {})
                    .get("supSearch", {})
                    .get("results", [])
                )

                if not results:
                    return ComponentMatch(found=False, source="nexar")

                best = results[0]["part"]
                offer = best.get("bestOffer") or {}
                prices = offer.get("prices", [])

                # Ищем USD цену за 1 шт
                price_usd = None
                for p in prices:
                    if p.get("currency") == "USD" and p.get("quantity", 0) <= 1:
                        price_usd = float(p["price"])
                        break
                if price_usd is None and prices:
                    price_usd = float(prices[0].get("price", 0))

                seller = offer.get("seller", {})
                inventory = offer.get("inventoryLevel", 0)

                # Альтернативы
                alternatives = []
                for r in results[1:4]:
                    alt = r.get("part", {})
                    alt_offer = alt.get("bestOffer") or {}
                    alt_prices = alt_offer.get("prices", [])
                    alt_price = float(alt_prices[0]["price"]) if alt_prices else None
                    if alt_price:
                        alternatives.append({
                            "name": f"{alt.get('manufacturer', {}).get('name', '')} {alt.get('mpn', '')}".strip(),
                            "price_usd": alt_price,
                            "url": alt_offer.get("clickUrl", ""),
                        })

                return ComponentMatch(
                    found=True,
                    source="nexar",
                    price_usd=price_usd,
                    shop_name=seller.get("name", ""),
                    shop_url=offer.get("clickUrl", ""),
                    manufacturer=best.get("manufacturer", {}).get("name", ""),
                    mpn=best.get("mpn", ""),
                    in_stock=inventory is not None and inventory > 0,
                    alternatives=alternatives,
                )

        except Exception:
            return ComponentMatch(found=False, source="nexar")
