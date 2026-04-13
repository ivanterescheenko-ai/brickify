import httpx

from .openai_provider import OpenAIProvider


class OllamaProvider(OpenAIProvider):
    def __init__(
        self, model: str = "llama4-scout", base_url: str = "http://localhost:11434"
    ):
        self._ollama_base = base_url
        super().__init__(
            api_key="ollama",
            model=model,
            base_url=f"{base_url}/v1",
        )
        self._provider_name = "ollama"

    def is_available(self) -> bool:
        try:
            r = httpx.get(f"{self._ollama_base}/api/tags", timeout=2)
            return r.status_code == 200
        except Exception:
            return False


class LMStudioProvider(OpenAIProvider):
    def __init__(
        self, model: str = "local-model", base_url: str = "http://localhost:1234"
    ):
        self._lmstudio_base = base_url
        super().__init__(
            api_key="lmstudio",
            model=model,
            base_url=f"{base_url}/v1",
        )
        self._provider_name = "lmstudio"

    def is_available(self) -> bool:
        try:
            r = httpx.get(f"{self._lmstudio_base}/v1/models", timeout=2)
            return r.status_code == 200
        except Exception:
            return False
