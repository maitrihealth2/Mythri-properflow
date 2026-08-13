"""
Sarvam LLM Provider — Dedicated provider for Maitri using Sarvam 105B.
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

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int,
        temperature: float,
    ) -> str:
        client = self._get_client()
        try:
            # Overriding max_tokens to ensure sufficient budget for reasoning
            safe_max_tokens = max(max_tokens, 4096)
            
            response = await client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                max_tokens=safe_max_tokens,
                temperature=temperature,
                stream=True,
            )
            
            final_text_chunks: list[str] = []
            
            async for chunk in response:
                if not chunk.choices:
                    continue
                    
                delta = chunk.choices[0].delta
                
                # Check for reasoning_content separately to not include it in final text
                # We just ignore reasoning_content for now, we only want actual content
                if getattr(delta, "content", None):
                    final_text_chunks.append(delta.content)

            result = "".join(final_text_chunks).strip()
            
            # Remove any <think>...</think> blocks if the model generated them despite prompt
            import re
            result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL | re.IGNORECASE).strip()
            
            if not result:
                raise ProviderEmptyResponseError(
                    f"Sarvam/{self.model} returned an empty final response."
                )
            return result

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"Sarvam timeout: {e}") from e

        except APIConnectionError as e:
            raise ProviderNetworkError(f"Sarvam connection error: {e}") from e

        except APIStatusError as e:
            status = e.status_code
            if status == 401:
                raise ProviderConfigurationError(
                    f"Sarvam authentication failed (401). Check SARVAM_API_KEY."
                ) from e
            elif status == 400:
                raise ProviderConfigurationError(
                    f"Sarvam bad request (400): {e.message}"
                ) from e
            elif status == 429:
                raise ProviderRateLimitError(
                    f"Sarvam rate limited (429)."
                ) from e
            elif status >= 500:
                raise ProviderServerError(
                    f"Sarvam server error ({status})."
                ) from e
            else:
                raise ProviderStreamError(
                    f"Sarvam unexpected status {status}: {e.message}"
                ) from e

        except (StopAsyncIteration, RuntimeError, GeneratorExit) as e:
            raise ProviderStreamError(
                f"Sarvam stream was interrupted: {e}"
            ) from e

    async def close(self) -> None:
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
            self._client = None
