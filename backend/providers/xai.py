from .openai_provider import OpenAIProvider


class XAIProvider(OpenAIProvider):
    def __init__(self, api_key: str, model: str = "grok-3"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://api.x.ai/v1",
        )
        self._provider_name = "xai"
