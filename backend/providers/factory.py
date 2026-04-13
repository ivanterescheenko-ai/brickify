from .anthropic import AnthropicProvider
from .base import BaseLLMProvider
from .deepseek import DeepSeekProvider
from .google import GoogleProvider
from .ollama import LMStudioProvider, OllamaProvider
from .openai_provider import OpenAIProvider
from .xai import XAIProvider

SUPPORTED_PROVIDERS = [
    "anthropic",
    "openai",
    "google",
    "xai",
    "deepseek",
    "ollama",
    "lmstudio",
]


def get_provider(config: dict) -> BaseLLMProvider:
    """
    Создаёт LLM провайдер из конфигурации.

    config:
        provider: str — имя провайдера
        api_key: str — API ключ (пустой для ollama/lmstudio)
        model: str — имя модели (опционально, используется дефолт)
        base_url: str — кастомный URL (опционально)
    """
    p = config.get("provider", "").lower().strip()
    key = config.get("api_key", "")
    model = config.get("model", "")
    url = config.get("base_url", "")

    match p:
        case "anthropic":
            return AnthropicProvider(
                api_key=key, model=model or "claude-sonnet-4-20250514"
            )
        case "openai":
            return OpenAIProvider(api_key=key, model=model or "gpt-4.1")
        case "google" | "gemini":
            return GoogleProvider(api_key=key, model=model or "gemini-2.5-flash")
        case "xai" | "grok":
            return XAIProvider(api_key=key, model=model or "grok-3")
        case "deepseek":
            return DeepSeekProvider(api_key=key, model=model or "deepseek-r1")
        case "ollama":
            return OllamaProvider(
                model=model or "llama4-scout",
                base_url=url or "http://localhost:11434",
            )
        case "lmstudio":
            return LMStudioProvider(
                model=model or "local-model",
                base_url=url or "http://localhost:1234",
            )
        case _:
            raise ValueError(
                f"Неизвестный провайдер: '{p}'. "
                f"Доступные: {', '.join(SUPPORTED_PROVIDERS)}"
            )
