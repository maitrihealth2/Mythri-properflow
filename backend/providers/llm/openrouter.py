"""
OpenRouter LLM Provider — Primary inference provider for Maitri.

Uses the OpenAI-compatible API at openrouter.ai.
Credentials are read exclusively from providers.llm.config (MAITRI_* vars).
"""
import httpx
from openai import AsyncOpenAI
from openai import APITimeoutError, APIConnectionError, APIStatusError

from providers.llm.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    PRIMARY_MODEL,
    PROVIDER_TIMEOUT,
)
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


class OpenRouterProvider(LLMProviderBase):
    """Primary LLM provider via OpenRouter API."""

    def __init__(self) -> None:
        self._http_client: httpx.AsyncClient | None = None
        self._client: AsyncOpenAI | None = None

    @property
    def name(self) -> str:
        return "OpenRouter"

    @property
    def model(self) -> str:
        return PRIMARY_MODEL

    def _get_client(self) -> AsyncOpenAI:
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
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                http_client=self._http_client,
                max_retries=0,  # Router handles retries via failover
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
            response = await client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                extra_body={"thinking": {"type": "disabled"}},  # Disable Qwen3 chain-of-thought
            )
            full_text: list[str] = []
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    full_text.append(chunk.choices[0].delta.content)

            result = "".join(full_text).strip()
            if not result:
                raise ProviderEmptyResponseError(
                    f"OpenRouter/{self.model} returned an empty stream."
                )
            return result

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"OpenRouter timeout: {e}") from e

        except APIConnectionError as e:
            raise ProviderNetworkError(f"OpenRouter connection error: {e}") from e

        except APIStatusError as e:
            status = e.status_code
            if status == 401:
                raise ProviderConfigurationError(
                    f"OpenRouter authentication failed (401). Check MAITRI_OPENROUTER_API_KEY."
                ) from e
            elif status == 400:
                raise ProviderConfigurationError(
                    f"OpenRouter bad request (400): {e.message}"
                ) from e
            elif status == 429:
                raise ProviderRateLimitError(
                    f"OpenRouter rate limited (429)."
                ) from e
            elif status >= 500:
                raise ProviderServerError(
                    f"OpenRouter server error ({status})."
                ) from e
            else:
                raise ProviderStreamError(
                    f"OpenRouter unexpected status {status}: {e.message}"
                ) from e

        except (StopAsyncIteration, RuntimeError, GeneratorExit) as e:
            raise ProviderStreamError(
                f"OpenRouter stream was interrupted: {e}"
            ) from e

    async def close(self) -> None:
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
            self._client = None
