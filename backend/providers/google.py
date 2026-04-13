import asyncio

from google import genai
from google.genai.types import GenerateContentConfig, Content, Part

from .base import BaseLLMProvider, LLMResponse, Message


class GoogleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model
        self._key = api_key

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        system_instruction = None
        contents = []

        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            else:
                role = "model" if m.role == "assistant" else "user"
                contents.append(Content(role=role, parts=[Part(text=m.content)]))

        config = GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )

        resp = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.model_name,
            contents=contents,
            config=config,
        )
        return LLMResponse(
            content=resp.text, model=self.model_name, provider="google"
        )

    def is_available(self) -> bool:
        return bool(self._key)
