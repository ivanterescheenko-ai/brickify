import google.generativeai as genai

from .base import BaseLLMProvider, LLMResponse, Message


class GoogleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
        self._key = api_key

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        history = []
        prompt = ""
        for m in messages:
            if m.role == "system":
                prompt = m.content + "\n\n"
            elif m.role == "user":
                history.append({"role": "user", "parts": [m.content]})
            elif m.role == "assistant":
                history.append({"role": "model", "parts": [m.content]})

        # Если есть system prompt, добавляем к первому user сообщению
        if prompt and history:
            history[0]["parts"][0] = prompt + history[0]["parts"][0]

        last_user = history.pop() if history else {"parts": [prompt]}
        chat = self.model.start_chat(history=history)
        resp = await chat.send_message_async(
            last_user["parts"][0],
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
        )
        return LLMResponse(
            content=resp.text, model=self.model_name, provider="google"
        )

    def is_available(self) -> bool:
        return bool(self._key)
