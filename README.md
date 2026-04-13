<div align="center">

# Brickify

### Describe what you want to build. AI does the rest.

**Component list + prices + step-by-step assembly guide — like LEGO instructions, but for real hardware.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)](https://docker.com)
[![Self-Hosted](https://img.shields.io/badge/self--hosted-BYOK-green.svg)](#bring-your-own-key)

<!-- Add screenshots: see docs/screenshots/ -->
<!-- ![Brickify Demo](docs/screenshots/home.png) -->

[Features](#features) · [Quick Start](#quick-start) · [Supported AI Models](#supported-ai-models) · [How It Works](#how-it-works) · [Contributing](CONTRIBUTING.md)

</div>

---

## Features

**Describe any device** — "FPV racing drone", "Arduino weather station", "3D printer" — and get:

- **Component tree** — device broken down into functional blocks with specific parts
- **Bill of Materials** — every component with specs, quantity, estimated price
- **Where to buy** — real shop links and prices (via [Tavily API](https://tavily.com), optional)
- **Assembly guide** — step-by-step instructions written for beginners, not engineers
- **7 AI providers** — Claude, GPT, Gemini, Grok, DeepSeek, Ollama, LM Studio
- **Dark theme** — industrial-technical design that looks like an engineer's notebook

### Bring Your Own Key

Brickify is **100% self-hosted**. Your API keys stay on your machine. No accounts, no telemetry, no cloud dependency. Works fully offline with Ollama.

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/ivanterescheenko-ai/brickify.git
cd brickify
cp .env.example .env
# Edit .env — set your provider and API key
docker compose up --build
```

Open the frontend URL shown in the terminal (default: port 3000).

### Without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
cd ..
cp .env.example .env   # edit with your API key
cd backend
uvicorn api.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open the URLs shown in each terminal.

---

## Supported AI Models

| Provider | Default Model | API Key | Notes |
|---|---|---|---|
| **Anthropic** (Claude) | `claude-sonnet-4-20250514` | Required | Best quality |
| **OpenAI** (GPT) | `gpt-4.1` | Required | Fast, reliable |
| **Google** (Gemini) | `gemini-2.5-flash` | Required | Good for budget |
| **xAI** (Grok) | `grok-3` | Required | OpenAI-compatible |
| **DeepSeek** | `deepseek-r1` | Required | Cost-effective |
| **Ollama** | `llama4-scout` | Not needed | Fully local, offline |
| **LM Studio** | any GGUF | Not needed | Fully local, offline |

Switch providers anytime from the Settings page. No restart needed.

---

## How It Works

```
User: "I want to build an FPV racing drone"
         |
         v
  [Decomposer Agent] — breaks device into blocks + components
         |
         v
  [Researcher Agent] — searches for real prices & shops (Tavily)
         |
         v
  [Writer Agent] — generates beginner-friendly assembly guide
         |
         v
  Component tree + BOM table + Step-by-step guide
```

All three agents use the same LLM provider you configure. The pipeline runs in ~30-60 seconds depending on the model.

---

## Price Search (optional)

By default, prices are **AI estimates** (shown with a label).

For real prices and shop links, add a [Tavily API](https://tavily.com) key to `.env`:

```env
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
```

Free tier: 1,000 searches/month. Without Tavily, everything still works — you just get estimated prices instead of real ones.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, async |
| Frontend | React 19, TypeScript, Vite, Zustand |
| LLM | anthropic, openai, google-genai SDKs |
| Search | Tavily API (optional) |
| Deploy | Docker Compose |

---

## Adding a New LLM Provider

1. Create `backend/providers/yourprovider.py` implementing `BaseLLMProvider`
2. Add a case in `backend/providers/factory.py`
3. Add to `PROVIDERS` list in `frontend/src/pages/Settings.tsx`
4. Add example to `.env.example`

If the provider has an OpenAI-compatible API, just extend `OpenAIProvider` — it's 5 lines of code. See `backend/providers/xai.py` for example.

---

## Environment Variables

```env
PROVIDER=anthropic          # anthropic | openai | google | xai | deepseek | ollama | lmstudio
API_KEY=sk-ant-xxx          # leave empty for ollama/lmstudio
MODEL=                      # optional, uses provider default
BASE_URL=                   # only for ollama/lmstudio
TAVILY_API_KEY=             # optional, for real price search
ALLOWED_ORIGINS=                    # comma-separated, defaults to local dev ports
PIPELINE_TIMEOUT=180        # max seconds for full pipeline
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Short version:

- New LLM provider? Follow the 4-step guide above
- Bug fix? Open an issue first, then PR
- Test with at least 3 different device descriptions before submitting

---

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">

**Built with AI, for builders.**

If Brickify helped you — give it a star, it helps others find it too.

</div>
