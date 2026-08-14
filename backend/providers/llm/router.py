"""
LLM Router — Maitri's provider-agnostic inference orchestrator.

Routing flow:
    router.generate(...)
        ↓
    SarvamProvider.generate()

Failover triggers:
    None currently (only one provider is active).
"""
import time
import asyncio
from typing import Optional

from providers.llm.sarvam import SarvamProvider
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

def _log(msg: str) -> None:
    """Structured provider telemetry — printed to stdout for log capture."""
    print(f"[LLM] {msg}", flush=True)


class LLMRouter:
    """
    Provider-agnostic LLM router.

    Singleton instance exposed as `llm_router` at module level.
    """

    def __init__(self) -> None:
        self._primary = SarvamProvider()

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.75,
    ) -> Optional[str]:
        """
        Generate a response using the primary provider (Sarvam).

        Returns the response text, or None if the provider fails.
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
            
        except ProviderError as exc:
            reason = _classify_reason(exc)
            _log(f"LLM_FAILOVER_SUCCESS=False SECONDARY_ERROR={type(exc).__name__}: {exc} REASON={reason}")
            # Return None — caller applies its own fallback text
            return None

    async def close(self) -> None:
        """Release all open HTTP connections."""
        if self._primary:
            await self._primary.close()


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

