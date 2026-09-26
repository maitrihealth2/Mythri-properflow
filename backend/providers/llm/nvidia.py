"""
NVIDIA NIM LLM Provider — Used exclusively for background summary / analysis tasks.

Model priority:
  Primary   → meta/llama-3.3-70b-instruct    (best quality, 128K ctx)
  Fallback  → nvidia/llama-3.1-nemotron-nano-8b-instruct  (fast, free tier)

Both models share the same NVIDIA NIM base URL and API key.
A single AsyncOpenAI client handles both — the model name is passed per call.

Automatic fallback chain:
  llama-3.3-70b → rate limit / timeout → nemotron-nano-8b → fail → raises ProviderError
  (LLMRouter.generate_summary() then falls back further to Sarvam → None)
"""
import os
import re
import httpx
from openai import AsyncOpenAI
from openai import APITimeoutError, APIConnectionError, APIStatusError

from providers.llm.config import PROVIDER_TIMEOUT
from providers.llm.exceptions import (
    ProviderConfigurationError,
    ProviderEmptyResponseError,
    ProviderError,
    ProviderNetworkError,
    ProviderRateLimitError,
    ProviderServerError,
    ProviderTimeoutError,
)
from providers.llm.provider_base import LLMProviderBase

NVIDIA_API_KEY  = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

# Primary: Google DiffusionGemma 26B — verified live & ultra-fast (2.9s) on NVIDIA NIM
NVIDIA_PRIMARY_MODEL  = "google/diffusiongemma-26b-a4b-it"

# Fallback: NVIDIA Nemotron 3 Ultra 550B — powerful fallback (3.6s)
NVIDIA_FALLBACK_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"

# Background tasks can wait longer — not user-facing
NVIDIA_TIMEOUT = 45.0


def _log(msg: str) -> None:
    print(f"[NVIDIA_NIM] {msg}", flush=True)


class NvidiaProvider(LLMProviderBase):
    """
    NVIDIA NIM LLM provider for background summary/analysis tasks.

    Uses a single shared AsyncOpenAI client for both primary and fallback models.
    The model name is specified per call — no need for two separate clients.
    """

    def __init__(self) -> None:
        if not NVIDIA_API_KEY:
            raise ProviderConfigurationError(
                "NVIDIA_API_KEY is not set. Add it to .env.local to enable NVIDIA NIM."
            )
        limits = httpx.Limits(
            max_keepalive_connections=10,
            max_connections=20,
            keepalive_expiry=30.0,
        )
        self._http_client = httpx.AsyncClient(limits=limits, timeout=NVIDIA_TIMEOUT)
        self._client = AsyncOpenAI(
            api_key=NVIDIA_API_KEY,
            base_url=NVIDIA_BASE_URL,
            http_client=self._http_client,
            max_retries=0,  # We handle retries ourselves with model fallback
        )

    @property
    def name(self) -> str:
        return "NvidiaNIM"

    @property
    def model(self) -> str:
        return NVIDIA_PRIMARY_MODEL

    async def _call_model(
        self,
        model: str,
        api_messages: list[dict],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """
        Non-streaming call to a NVIDIA NIM model.
        Strips <think>...</think> blocks (reasoning model output).
        Maps OpenAI SDK errors to our ProviderError hierarchy.
        """
        # Clamp max_tokens to a safe range for NIM
        safe_tokens = min(max(max_tokens, 256), 4096)

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=api_messages,
                max_tokens=safe_tokens,
                temperature=temperature,
                stream=False,
            )

            if not response.choices:
                raise ProviderEmptyResponseError(f"[{model}] returned no choices")

            text = response.choices[0].message.content or ""

            # Strip chain-of-thought reasoning blocks if present
            text = re.sub(
                r"<think>.*?</think>", "", text,
                flags=re.DOTALL | re.IGNORECASE
            ).strip()

            if not text:
                raise ProviderEmptyResponseError(f"[{model}] returned empty content after stripping")

            usage = response.usage
            _log(
                f"model={model} "
                f"prompt_tokens={usage.prompt_tokens if usage else '?'} "
                f"completion_tokens={usage.completion_tokens if usage else '?'}"
            )
            return text

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"[{model}] timeout: {e}") from e
        except APIConnectionError as e:
            raise ProviderNetworkError(f"[{model}] network error: {e}") from e
        except APIStatusError as e:
            if e.status_code == 429:
                raise ProviderRateLimitError(f"[{model}] rate limit (429): {e}") from e
            if e.status_code >= 500:
                raise ProviderServerError(f"[{model}] server error ({e.status_code}): {e}") from e
            raise ProviderError(f"[{model}] HTTP {e.status_code}: {e}") from e
        except (ProviderEmptyResponseError, ProviderConfigurationError):
            raise  # Propagate our own errors unchanged
        except Exception as e:
            raise ProviderError(f"[{model}] unexpected error: {e}") from e

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int = 1500,
        temperature: float = 0.2,
    ) -> str:
        """
        Generate with automatic model fallback:
          1. Try primary model (llama-3.3-70b-instruct)
          2. On rate-limit / timeout / server error → try fallback (nemotron-nano-8b)
          3. If fallback also fails → raise ProviderError (LLMRouter catches this
             and falls through to Sarvam)

        Note: temperature=0.2 default is intentional for structured JSON output.
        """
        # ── Attempt 1: Primary 70B model ──────────────────────────────────────
        try:
            result = await self._call_model(
                NVIDIA_PRIMARY_MODEL, api_messages, max_tokens, temperature
            )
            _log(f"PRIMARY_SUCCESS model={NVIDIA_PRIMARY_MODEL}")
            return result

        except ProviderConfigurationError:
            raise  # Config errors propagate immediately — no point retrying

        except (ProviderRateLimitError, ProviderTimeoutError, ProviderServerError) as e:
            _log(
                f"PRIMARY_FAIL model={NVIDIA_PRIMARY_MODEL} "
                f"reason={type(e).__name__} — trying fallback model"
            )

        except ProviderError as e:
            err_str = str(e)
            # 410 = model EOL, 404 = model removed — both warrant fallback not crash
            if "410" in err_str or "404" in err_str or "Gone" in err_str:
                _log(
                    f"PRIMARY_FAIL model={NVIDIA_PRIMARY_MODEL} "
                    f"(model EOL/removed) — trying fallback model"
                )
            else:
                _log(
                    f"PRIMARY_FAIL model={NVIDIA_PRIMARY_MODEL} "
                    f"error={e} — trying fallback model"
                )

        # ── Attempt 2: Fallback nano model ────────────────────────────────────
        try:
            result = await self._call_model(
                NVIDIA_FALLBACK_MODEL, api_messages, max_tokens, temperature
            )
            _log(f"FALLBACK_SUCCESS model={NVIDIA_FALLBACK_MODEL}")
            return result

        except ProviderError as e:
            _log(
                f"FALLBACK_FAIL model={NVIDIA_FALLBACK_MODEL} "
                f"reason={type(e).__name__}: {e}"
            )
            # Re-raise so LLMRouter.generate_summary() can fall through to Sarvam
            raise ProviderError(
                f"NVIDIA NIM: both {NVIDIA_PRIMARY_MODEL} and {NVIDIA_FALLBACK_MODEL} failed. "
                f"Last: {e}"
            ) from e

    async def stream(
        self,
        api_messages: list[dict],
        max_tokens: int = 1500,
        temperature: float = 0.2,
    ):
        """
        Streaming not used for summary tasks.
        Satisfies LLMProviderBase interface by yielding the generate() result.
        """
        result = await self.generate(api_messages, max_tokens, temperature)
        yield result

    async def close(self) -> None:
        """Release HTTP connections gracefully."""
        try:
            await self._http_client.aclose()
        except Exception:
            pass
