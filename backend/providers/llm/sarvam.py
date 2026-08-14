"""
Sarvam LLM Provider — Dedicated provider for Mythri using Sarvam 105B.
"""
import httpx
from openai import AsyncOpenAI
from openai import APITimeoutError, APIConnectionError, APIStatusError
import os

from providers.llm.config import PROVIDER_TIMEOUT
from providers.llm.exceptions import (
    ProviderConfigurationError,
    ProviderEmptyResponseError,
    ProviderNetworkError,
    ProviderRateLimitError,
    ProviderServerError,
    ProviderStreamError,
    ProviderTimeoutError,
)
from providers.llm.provider_base import LLMProviderBase

# Pull from env since it's specific to Sarvam
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
SARVAM_MODEL = "sarvam-105b"


class SarvamProvider(LLMProviderBase):
    """LLM provider via Sarvam API."""

    def __init__(self) -> None:
        self._http_client: httpx.AsyncClient | None = None
        self._client: AsyncOpenAI | None = None

    @property
    def name(self) -> str:
        return "Sarvam"

    @property
    def model(self) -> str:
        return SARVAM_MODEL

    def _get_client(self) -> AsyncOpenAI:
        if not SARVAM_API_KEY:
            raise ProviderConfigurationError("SARVAM_API_KEY environment variable is not set.")
            
        if self._client is None:
            limits = httpx.Limits(
                max_keepalive_connections=50,
                max_connections=100,
                keepalive_expiry=30.0,
            )
            self._http_client = httpx.AsyncClient(
                limits=limits,
                timeout=PROVIDER_TIMEOUT,
            )
            self._client = AsyncOpenAI(
                api_key=SARVAM_API_KEY,
                base_url=SARVAM_BASE_URL,
                http_client=self._http_client,
                max_retries=0, 
            )
        return self._client

    async def stream(
        self,
        api_messages: list[dict],
        max_tokens: int,
        temperature: float,
    ):
        client = self._get_client()
        try:
            safe_max_tokens = max(max_tokens, 4096)
            
            response = await client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                max_tokens=safe_max_tokens,
                temperature=temperature,
                stream=True,
            )
            
            async for chunk in response:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if getattr(delta, "content", None):
                    # Filter out think tags immediately if they stream in
                    content = delta.content
                    if "<think>" in content or "</think>" in content:
                        continue # simple filter
                    yield content

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"Sarvam timed out: {e}") from e
        except APIConnectionError as e:
            raise ProviderNetworkError(f"Sarvam network error: {e}") from e
        except APIStatusError as e:
            if e.status_code == 429:
                raise ProviderRateLimitError(f"Sarvam rate limit: {e}") from e
            if e.status_code >= 500:
                raise ProviderServerError(f"Sarvam server error: {e}") from e
            raise ProviderError(f"Sarvam HTTP {e.status_code}: {e}") from e
        except Exception as e:
            raise ProviderStreamError(f"Sarvam streaming failed: {e}") from e

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int,
        temperature: float,
    ) -> str:
        chunks = []
        async for chunk in self.stream(api_messages, max_tokens, temperature):
            chunks.append(chunk)
            
        result = "".join(chunks).strip()
        import re
        result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL | re.IGNORECASE).strip()
        
        if not result:
            raise ProviderEmptyResponseError("Sarvam returned an empty response")
            
        return result

    async def close(self) -> None:
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
            self._client = None
