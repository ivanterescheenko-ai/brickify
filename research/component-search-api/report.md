# API для поиска электронных компонентов и hardware
*Дата: 2026-04-13 | Версия: 1.0*

---

## Methodology
| Параметр | Значение |
|----------|---------|
| Research questions | 7 |
| Web-источники | 15+ |
| Период покрытия | 2024–2026 |

---

## Executive Summary

Рынок API для поиска компонентов делится на 3 уровня: агрегаторы (Nexar/Octopart — покрывают 50+ дистрибьюторов одним запросом), прямые API дистрибьюторов (DigiKey, Mouser, Farnell — структурированные данные, но требуют OAuth), и бесплатные/reverse-engineered API (LCSC, jlcsearch — без ключа, но нестабильные).

**Ключевой вывод:** Для Brickify оптимальная стратегия — **Nexar API (бесплатный tier 100 parts/месяц) как primary + jlcsearch (бесплатный, без лимитов) для JLCPCB/LCSC + Tavily для non-electronic**. Amazon PA-API **не подходит** (требует affiliate sales, deprecating в 2026).

---

## Ключевые находки

### 1. Nexar API (бывший Octopart)

**Прямой ответ:** Лучший агрегатор. GraphQL API, покрывает 50+ дистрибьюторов (DigiKey, Mouser, Arrow, Farnell, Newark, RS Components). Один запрос — цены от всех.

| Параметр | Значение |
|---|---|
| Endpoint | GraphQL: `https://api.nexar.com/graphql` |
| Auth | OAuth 2.0 (client credentials) |
| Free tier | **Evaluation: 100 matched parts/месяц** |
| Standard | 2,000 parts/месяц (pricing hidden) |
| Pro | 15,000 parts/месяц |
| Enterprise | Unlimited (custom) |
| Response | JSON (GraphQL) |
| Покрытие | Электроника: IC, passive, connectors, MCU. НЕ покрывает: моторы, рамы, механику |
| MCP Server | [nexar-mcp](https://github.com/Farad-Labs/nexar-mcp) — готовая интеграция для AI |

**ВАЖНО:** Octopart REST API v4 **deprecated** (31 августа). Нужно мигрировать на Nexar GraphQL.

**Для Brickify:** 100 parts/месяц — мало для production, но достаточно для demo. Стоит сделать primary source для электроники.

Sources: [Nexar API](https://nexar.com/api), [Compare Plans](https://nexar.com/compare-plans), [Nexar MCP](https://github.com/Farad-Labs/nexar-mcp)

---

### 2. DigiKey API v4

| Параметр | Значение |
|---|---|
| Endpoint | REST: `https://api.digikey.com/products/v4/search` |
| Auth | **OAuth 2.0** (authorization code flow — сложнее, требует redirect URI) |
| Free tier | Да, но лимиты не публикуются |
| Rate limit | ~120 requests/minute (burst), daily cap exists |
| Response | JSON |
| Python SDK | [digikey-apiv4](https://pypi.org/project/digikey-apiv4/) |
| Покрытие | Электроника: полный каталог DigiKey |

**Проблемы для Brickify:** OAuth 2.0 с authorization code flow (не client credentials) — требует redirect URI и user consent. Сложно для self-hosted app где ключ вводится в Settings. Лучше через Nexar.

Sources: [DigiKey Developer](https://developer.digikey.com/products/product-information-v4), [DigiKey FAQ](https://developer.digikey.com/faq)

---

### 3. Mouser API

| Параметр | Значение |
|---|---|
| Endpoint | REST v2: `https://api.mouser.com/api/v2/search/keyword` |
| Auth | API Key (в query parameter `apiKey`) |
| Free tier | Да, регистрация бесплатна |
| Rate limit | Не публикуется, auto-retry с Retry-After header |
| Response | JSON |
| Python SDK | [mouser-api](https://github.com/sparkmicro/mouser-api) |
| Endpoints | KeywordSearch, PartNumberSearch, ManufacturerSearch |

**Для Brickify:** Проще DigiKey (API key вместо OAuth). Хороший secondary source если Nexar лимит исчерпан.

Sources: [Mouser API Search](https://www.mouser.com/api-search/), [Mouser API Docs](https://api.mouser.com/api/docs/ui/index)

---

### 4. Farnell / Element14 / Newark API

| Параметр | Значение |
|---|---|
| Endpoint | REST: `https://api.element14.com/catalog/products` |
| Auth | API Key |
| Free tier | "Courtesy usage allowance" (лимит не публикуется) |
| Response | JSON / XML |
| Покрытие | 1.3M+ products (Farnell EU, Newark US, Element14 APAC) |
| Access levels | STANDARD (generic), CONTRACT (customer-specific pricing) |

**Для Brickify:** Через Nexar уже покрыт. Отдельная интеграция только если нужны CONTRACT prices.

Sources: [Element14 Partner Portal](https://partner.element14.com/), [API Docs](https://partner.element14.com/docs)

---

### 5. LCSC API (официальный + reverse-engineered)

#### Официальный API
| Параметр | Значение |
|---|---|
| Base URL | `https://ips.lcsc.com` |
| Endpoints | `/rest/wmsc2agent/search/product`, `/rest/wmsc2agent/product/info/{id}` |
| Auth | API key + nonce + signature + timestamp |
| Rate limit | **1000 searches/день, 200/минуту** |
| Response | JSON |

#### Reverse-engineered endpoints
| Endpoint | Метод | Описание |
|---|---|---|
| `https://lcsc.com/api/global/additional/search?q=<mpn>` | GET | Поиск по MPN |
| `https://lcsc.com/api/products/search` | POST | Полный поиск (нужен CSRF + cookies) |

#### jlcsearch (tscircuit) — ЛУЧШАЯ НАХОДКА
| Параметр | Значение |
|---|---|
| Base URL | `https://jlcsearch.tscircuit.com` |
| Auth | **Не нужна** |
| Rate limit | **Нет (open source)** |
| Response | JSON (добавь `.json` к любому URL) |
| Пример | `curl https://jlcsearch.tscircuit.com/resistors/list.json?resistance=1k` |
| GitHub | [tscircuit/jlcsearch](https://github.com/tscircuit/jlcsearch) |
| DB | 11GB SQLite база всех JLCPCB компонентов |

**Для Brickify:** **jlcsearch — идеальный бесплатный source для JLCPCB/LCSC**. Заменяет наш текущий LCSC provider. Без ключа, без лимитов, структурированные данные.

Sources: [LCSC OpenAPI](https://www.lcsc.com/docs/openapi/index.html), [jlcsearch Docs](https://docs.tscircuit.com/web-apis/jlcsearch-api), [LCSC API Gist](https://gist.github.com/Bouni/fabcc1965036d4816c3d48e2dbf6b169)

---

### 6. Amazon Product Advertising API (PA-API 5.0)

| Параметр | Значение |
|---|---|
| Auth | Affiliate account + API credentials |
| Free tier | 1 TPS, 8640 TPD (30 дней) |
| Requirement | **10+ qualifying orders за последние 30 дней** |
| DEPRECATING | **30 апреля 2026** → мигрируют на Creators API |

**Для Brickify:** ❌ **НЕ подходит.** Требует affiliate sales, deprecating. Лучше через Tavily site-scoped search.

Sources: [PA-API Rates](https://webservices.amazon.com/paapi5/documentation/troubleshooting/api-rates.html)

---

### 7. AliExpress API

| Параметр | Значение |
|---|---|
| Auth | App Key + Secret Key (требует seller account) |
| Registration | Seller account → Developer account → Application approval (1-2 дня) |
| Seller countries | Только 6: China, Russia, Spain, Italy, Turkey, France |
| Rate limit | 5,000 requests |
| APIs | Affiliate API, Dropshipping API, Price API |

**Для Brickify:** Сложная регистрация, ограниченная география. Tavily site-scoped search лучше.

---

### 8. Альтернативы

| Сервис | Тип | Бесплатно | Примечание |
|---|---|---|---|
| **FindChips** (Nexar) | Агрегатор | Через Nexar API | Тот же владелец что Octopart |
| **OEMsecrets** | Агрегатор | API по запросу | JSON + JavaScript API |
| **SnapEDA** | CAD models | Бесплатные модели | Не для pricing |
| **Nexar MCP** | AI integration | Бесплатно | MCP server для Claude/LLM |
| **jlcparts** | Open source DB | Бесплатно | 11GB SQLite база JLCPCB |

---

## Как применить к Brickify

### Рекомендуемая стратегия (обновлённая)

```
Компонент → category?
  │
  ├── electronic → Nexar GraphQL (free 100/мес) → jlcsearch (unlimited) → Mouser API
  ├── mechanical → Tavily web search → Amazon site-scoped
  ├── wiring/fastener → jlcsearch → AliExpress site-scoped → Tavily
  └── fallback → AI estimate из decomposer
```

### Что делать прямо сейчас

1. **Заменить LCSC provider на jlcsearch** — бесплатный, без ключа, без лимитов, структурированные данные
2. **Мигрировать Octopart на Nexar GraphQL** — текущий REST API deprecated
3. **Добавить Mouser API** как альтернативу Nexar (простой API key, не OAuth)
4. **Убрать Amazon PA-API** из планов — deprecating, требует affiliate

### Чего избегать

- DigiKey API напрямую (OAuth authorization code flow — слишком сложно для self-hosted)
- AliExpress API напрямую (требует seller account из 6 стран)
- Amazon PA-API (deprecating + affiliate requirement)
- Скрейпинг LCSC без CSRF (нестабильно, банят)

### Приоритизированный план

1. **Сейчас:** Интегрировать jlcsearch API (0 усилий на auth, instant results)
2. **Потом:** Мигрировать Octopart → Nexar GraphQL
3. **Потом:** Добавить Mouser API key support в Settings
4. **В перспективе:** Element14 API для EU покрытия

---

## Источники

### Web
1. [Nexar API](https://nexar.com/api) — главный агрегатор, GraphQL
2. [Nexar Plans](https://nexar.com/compare-plans) — Free: 100 parts/мес
3. [DigiKey Developer](https://developer.digikey.com/products/product-information-v4) — OAuth 2.0 REST API
4. [Mouser API](https://www.mouser.com/api-search/) — API key, REST
5. [Element14 Partner](https://partner.element14.com/) — API key, REST
6. [LCSC OpenAPI](https://www.lcsc.com/docs/openapi/index.html) — официальный API с подписью
7. [jlcsearch](https://docs.tscircuit.com/web-apis/jlcsearch-api) — бесплатный open source
8. [jlcparts GitHub](https://github.com/yaqwsx/jlcparts) — 11GB SQLite database
9. [Nexar MCP Server](https://github.com/Farad-Labs/nexar-mcp) — AI integration
10. [Amazon PA-API](https://webservices.amazon.com/paapi5/documentation/) — deprecating 2026
