"""
LLM Router — Maitri's provider-agnostic inference orchestrator.

Routing flow:
    router.generate(...)
        ↓
    OpenRouterProvider.generate()       [Primary]
        ↓ (on failover exception)
    HuggingFaceProvider.generate()      [Secondary]
        ↓ (if also fails)
    raises — caller applies fallback text

Failover triggers:
    ProviderTimeoutError, ProviderRateLimitError, ProviderServerError,
    ProviderNetworkError, ProviderStreamError, ProviderEmptyResponseError

No failover:
    ProviderConfigurationError  → raised immediately (bad key / bad request)
"""
import time
import asyncio
from typing import Optional

from providers.llm.openrouter import OpenRouterProvider
from providers.llm.huggingface import HuggingFaceProvider
from providers.llm.exceptions import (
    ProviderConfigurationError,
    ProviderEmptyResponseError,
    ProviderError,
    ProviderNetworkError,
    ProviderRateLimitError,
    ProviderServerError,
    ProviderStreamError,
    ProviderTimeoutError,
)

# Exceptions that trigger automatic failover to secondary provider
_FAILOVER_EXCEPTIONS = (
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderServerError,
    ProviderNetworkError,
    ProviderStreamError,
    ProviderEmptyResponseError,
)


def _log(msg: str) -> None:
    """Structured provider telemetry — printed to stdout for log capture."""
    print(f"[LLM] {msg}", flush=True)


class LLMRouter:
    """
    Provider-agnostic LLM router with automatic single-retry failover.

    Singleton instance exposed as `llm_router` at module level.
    """

    def __init__(self) -> None:
        self._primary = OpenRouterProvider()
        self._secondary = HuggingFaceProvider()
        self._lock = asyncio.Lock()

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.75,
    ) -> Optional[str]:
        """
        Generate a response using the primary provider, failing over to the
        secondary provider if a transient error occurs.

        Returns the response text, or None if both providers fail (the caller
        is expected to apply a user-facing fallback string in that case).

        Raises:
            ProviderConfigurationError — immediately, never fails over.
        """
        t0 = time.perf_counter()
        provider = self._primary

        try:
            result = await provider.generate(api_messages, max_tokens, temperature)
            elapsed = time.perf_counter() - t0
            _log(
                f"LLM_PROVIDER={provider.name} "
                f"LLM_MODEL={provider.model} "
                f"RESPONSE_TIME={elapsed:.2f}s "
                f"STREAMING_ENABLED=True "
                f"STREAM_COMPLETED=True"
            )
            return result

        except ProviderConfigurationError:
            # Configuration errors are never retried — re-raise immediately
            raise

        except _FAILOVER_EXCEPTIONS as primary_exc:
            reason = _classify_reason(primary_exc)
            _log(f"LLM_FAILOVER=Activated LLM_FAILOVER_REASON={reason} PRIMARY={provider.name}")

            # ── Failover to secondary ──────────────────────────────────────
            provider = self._secondary
            t1 = time.perf_counter()
            try:
                result = await provider.generate(api_messages, max_tokens, temperature)
                elapsed = time.perf_counter() - t1
                _log(
                    f"LLM_PROVIDER={provider.name} "
                    f"LLM_MODEL={provider.model} "
                    f"RESPONSE_TIME={elapsed:.2f}s "
                    f"STREAMING_ENABLED=True "
                    f"STREAM_COMPLETED=True "
                    f"LLM_FAILOVER_SUCCESS=True"
                )
                return result

            except ProviderConfigurationError:
                raise

            except _FAILOVER_EXCEPTIONS as secondary_exc:
                _log(
                    f"LLM_FAILOVER_SUCCESS=False "
                    f"SECONDARY_ERROR={type(secondary_exc).__name__}: {secondary_exc}"
                )
                # Return None — caller applies its own fallback text
                return None

    async def close(self) -> None:
        """Release all open HTTP connections for both providers."""
        await self._primary.close()
        await self._secondary.close()


def _classify_reason(exc: ProviderError) -> str:
    if isinstance(exc, ProviderTimeoutError):
        return "Timeout"
    if isinstance(exc, ProviderRateLimitError):
        return "HTTP429"
    if isinstance(exc, ProviderServerError):
        return "HTTP5xx"
    if isinstance(exc, ProviderNetworkError):
        return "NetworkFailure"
    if isinstance(exc, ProviderStreamError):
        return "StreamingFailure"
    if isinstance(exc, ProviderEmptyResponseError):
        return "EmptyResponse"
    return "Unknown"


# ---------------------------------------------------------------------------
# Module-level singleton — import this in sarvam_client.py
# ---------------------------------------------------------------------------
llm_router = LLMRouter()
