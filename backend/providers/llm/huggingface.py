"""
Hugging Face Inference Provider — Secondary (failover) provider for Maitri.

Uses the HuggingFace Inference API's OpenAI-compatible endpoint.
Credentials are read exclusively from providers.llm.config (MAITRI_* vars).
"""
import httpx
from openai import AsyncOpenAI
from openai import APITimeoutError, APIConnectionError, APIStatusError

from providers.llm.config import (
    HF_API_KEY,
    HF_BASE_URL,
    SECONDARY_MODEL,
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


class HuggingFaceProvider(LLMProviderBase):
    """Secondary (failover) LLM provider via Hugging Face Inference API."""

    def __init__(self) -> None:
        self._http_client: httpx.AsyncClient | None = None
        self._client: AsyncOpenAI | None = None

    @property
    def name(self) -> str:
        return "HuggingFace"

    @property
    def model(self) -> str:
        return SECONDARY_MODEL

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
                api_key=HF_API_KEY,
                base_url=HF_BASE_URL,
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
            # Inject /no-think into the system prompt to disable Qwen3 chain-of-thought
            # on HuggingFace Router, which does not support the "thinking" extra_body field.
            hf_messages = []
            for msg in api_messages:
                if msg.get("role") == "system" and "/no-think" not in msg["content"]:
                    hf_messages.append({**msg, "content": msg["content"] + "\n\n/no-think"})
                else:
                    hf_messages.append(msg)

            response = await client.chat.completions.create(
                model=self.model,
                messages=hf_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            full_text: list[str] = []
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    full_text.append(chunk.choices[0].delta.content)

            result = "".join(full_text).strip()
            if not result:
                raise ProviderEmptyResponseError(
                    f"HuggingFace/{self.model} returned an empty stream."
                )
            return result

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"HuggingFace timeout: {e}") from e

        except APIConnectionError as e:
            raise ProviderNetworkError(f"HuggingFace connection error: {e}") from e

        except APIStatusError as e:
            status = e.status_code
            if status == 401:
                raise ProviderConfigurationError(
                    f"HuggingFace authentication failed (401). Check MAITRI_HF_API_KEY."
                ) from e
            elif status == 400:
                raise ProviderConfigurationError(
                    f"HuggingFace bad request (400): {e.message}"
                ) from e
            elif status == 429:
                raise ProviderRateLimitError(
                    f"HuggingFace rate limited (429)."
                ) from e
            elif status >= 500:
                raise ProviderServerError(
                    f"HuggingFace server error ({status})."
                ) from e
            else:
                raise ProviderStreamError(
                    f"HuggingFace unexpected status {status}: {e.message}"
                ) from e

        except (StopAsyncIteration, RuntimeError, GeneratorExit) as e:
            raise ProviderStreamError(
                f"HuggingFace stream was interrupted: {e}"
            ) from e

    async def close(self) -> None:
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
            self._client = None
