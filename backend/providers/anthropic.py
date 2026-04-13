import asyncio

import anthropic

from .base import BaseLLMProvider, LLMResponse, Message


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        system = next((m.content for m in messages if m.role == "system"), None)
        user_msgs = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        # Anthropic SDK синхронный — оборачиваем в executor
        resp = await asyncio.to_thread(
            self.client.messages.create,
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system or "",
            messages=user_msgs,
        )
        return LLMResponse(
            content=resp.content[0].text,
            model=self.model,
            provider="anthropic",
        )

    def is_available(self) -> bool:
        return bool(self.client.api_key)
