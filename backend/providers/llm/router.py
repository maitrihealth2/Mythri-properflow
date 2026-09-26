"""
LLM Router — Mythri's provider-agnostic inference orchestrator.

Routing flow:
    Foreground chat (streaming):
        router.stream(...)           →  SarvamProvider  (105B conversations)

    Background tasks (summaries, assessor, session summary, living context, persona):
        router.generate(...)         →  SarvamProvider  (default, existing callers unchanged)
        router.generate_summary(...) →  NvidiaProvider  (llama-3.3-70b via NIM)

    generate_summary() should be called from:
        - MasterMemorySynthesizer.synthesize_user()
        - generate_session_summary()
        - update_living_context() / incremental_updater
        - _update_persona_async()

    If NVIDIA_API_KEY is missing or NIM fails, generate_summary() automatically
    falls back to Sarvam — so background tasks NEVER hard-fail.
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
        self._summary_provider = None  # Lazy-init on first generate_summary() call

    def _get_summary_provider(self):
        """
        Lazy-initialise NvidiaProvider on first use.
        Lazy init avoids import-time errors if NVIDIA_API_KEY is not yet set.
        """
        if self._summary_provider is None:
            try:
                from providers.llm.nvidia import NvidiaProvider
                self._summary_provider = NvidiaProvider()
                _log("NVIDIA NIM provider initialised for background summary tasks.")
            except Exception as e:
                _log(
                    f"NVIDIA NIM provider init failed ({e}). "
                    "Summary calls will fall back to Sarvam automatically."
                )
                self._summary_provider = "UNAVAILABLE"
        return self._summary_provider

    # ─────────────────────────────────────────────────────────────────────────
    # Foreground: generate() uses Sarvam (maintains backwards compat for all
    # existing callers that already use llm_router.generate())
    # ─────────────────────────────────────────────────────────────────────────

    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.75,
    ) -> Optional[str]:
        """
        Generate a response using Sarvam 105B.
        Existing foreground callers (greetings, assessor, start_session) use this.
        Returns None on failure.
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
            # Config errors are never retried — re-raise immediately
            raise

        except ProviderError as exc:
            reason = _classify_reason(exc)
            _log(
                f"LLM_FAIL PROVIDER={provider.name} "
                f"ERROR={type(exc).__name__}: {exc} REASON={reason}"
            )
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Background summaries: generate_summary() uses NVIDIA NIM → Sarvam fallback
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_summary(
        self,
        api_messages: list[dict],
        max_tokens: int = 1500,
        temperature: float = 0.2,
        task_name: str = "summary",
    ) -> Optional[str]:
        """
        Generate background summary / analysis tasks using NVIDIA NIM.

        Design principles:
        - temperature=0.2 for deterministic structured JSON output
        - max_tokens=1500 by default (whole-DB synthesis may need more)
        - Dual-model fallback inside NvidiaProvider (70b → nano)
        - If both NVIDIA models fail → falls back to Sarvam
        - If Sarvam also fails → returns None (never raises)
        - Callers should check `if result is None: return` and skip gracefully

        Example usage:
            response = await llm_router.generate_summary(
                api_messages=messages,
                max_tokens=1500,
                task_name="master_synthesizer"
            )
            if response is None:
                logger.warning("Summary skipped — all providers failed")
                return None
        """
        t0 = time.perf_counter()
        nvidia = self._get_summary_provider()

        # ── Attempt 1: NVIDIA NIM (primary + internal nano fallback) ─────────
        if nvidia and nvidia != "UNAVAILABLE":
            try:
                result = await nvidia.generate(api_messages, max_tokens, temperature)
                elapsed = time.perf_counter() - t0
                _log(
                    f"SUMMARY_PROVIDER=NvidiaNIM "
                    f"TASK={task_name} "
                    f"RESPONSE_TIME={elapsed:.2f}s"
                )
                return result

            except ProviderConfigurationError as e:
                _log(
                    f"SUMMARY_NIM_CONFIG_ERROR task={task_name}: {e} "
                    "— marking NIM unavailable, falling back to Sarvam"
                )
                self._summary_provider = "UNAVAILABLE"

            except ProviderError as e:
                _log(
                    f"SUMMARY_NIM_FAIL task={task_name} "
                    f"reason={type(e).__name__}: {e} — falling back to Sarvam"
                )

            except Exception as e:
                _log(
                    f"SUMMARY_NIM_UNEXPECTED task={task_name}: {e} "
                    "— falling back to Sarvam"
                )

        # ── Attempt 2: Sarvam fallback ────────────────────────────────────────
        try:
            _log(f"SUMMARY_FALLBACK_TO_SARVAM task={task_name}")
            result = await self._primary.generate(api_messages, max_tokens, temperature)
            elapsed = time.perf_counter() - t0
            _log(
                f"SUMMARY_PROVIDER=Sarvam(fallback) "
                f"TASK={task_name} "
                f"RESPONSE_TIME={elapsed:.2f}s"
            )
            return result

        except Exception as e:
            _log(
                f"SUMMARY_SARVAM_FALLBACK_FAIL task={task_name}: {e} "
                "— returning None"
            )
            return None  # Both failed — caller skips gracefully

    # ─────────────────────────────────────────────────────────────────────────
    # Streaming: always Sarvam (foreground chat only)
    # ─────────────────────────────────────────────────────────────────────────

    async def stream(
        self,
        api_messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.75,
    ):
        """
        Stream response dynamically from Sarvam (foreground chat only).
        """
        provider = self._primary
        try:
            async for chunk in provider.stream(api_messages, max_tokens, temperature):
                yield chunk
        except ProviderConfigurationError:
            raise
        except ProviderError as exc:
            reason = _classify_reason(exc)
            _log(
                f"LLM_STREAM_FAIL PROVIDER={provider.name} "
                f"ERROR={type(exc).__name__}: {exc} REASON={reason}"
            )
            return

    async def close(self) -> None:
        """Release all open HTTP connections."""
        if self._primary:
            await self._primary.close()
        if self._summary_provider and self._summary_provider != "UNAVAILABLE":
            await self._summary_provider.close()


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
# Module-level singleton — import this in all modules that need LLM calls
# ---------------------------------------------------------------------------
llm_router = LLMRouter()
