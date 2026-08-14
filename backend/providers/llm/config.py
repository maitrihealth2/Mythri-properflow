"""
Centralized credential and model configuration for Mythri LLM providers.

Reads ONLY from MYTHRI_* environment variables.
"""
import os
import pathlib
from dotenv import load_dotenv

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(
            f"[Mythri LLM Config] Required environment variable '{key}' is missing or empty. "
            f"Add it to .env.local under the MYTHRI LLM PROVIDERS section."
        )
    return value


def _optional(key: str, default: str = "") -> str:
    return os.getenv(key, default)

# ---------------------------------------------------------------------------
# Timeouts (seconds)
# ---------------------------------------------------------------------------
PROVIDER_TIMEOUT: float = float(_optional("MYTHRI_PROVIDER_TIMEOUT", "60"))
