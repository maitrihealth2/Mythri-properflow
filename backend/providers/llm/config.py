"""
Centralized credential and model configuration for Maitri LLM providers.

Reads ONLY from MAITRI_* environment variables.
Never touches HF_TOKEN, OPENROUTER_API_KEY, SARVAM_API_KEY, or any other
existing project variable.
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
            f"[Maitri LLM Config] Required environment variable '{key}' is missing or empty. "
            f"Add it to .env.local under the MAITRI LLM PROVIDERS section."
        )
    return value


def _optional(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# ---------------------------------------------------------------------------
# Provider credentials — loaded exclusively from MAITRI_* keys
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY: str = _require("MAITRI_OPENROUTER_API_KEY")
HF_API_KEY: str = _require("MAITRI_HF_API_KEY")

# ---------------------------------------------------------------------------
# Model names — use provider-canonical IDs
# ---------------------------------------------------------------------------
PRIMARY_MODEL: str = _optional("MAITRI_PRIMARY_MODEL", "qwen/qwen3-32b")  # OpenRouter format
SECONDARY_MODEL: str = _optional("MAITRI_SECONDARY_MODEL", "Qwen/Qwen3-32B")  # HF format

# ---------------------------------------------------------------------------
# Provider endpoints
# ---------------------------------------------------------------------------
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
HF_BASE_URL: str = "https://router.huggingface.co/v1"

# ---------------------------------------------------------------------------
# Timeouts (seconds)
# ---------------------------------------------------------------------------
PROVIDER_TIMEOUT: float = float(_optional("MAITRI_PROVIDER_TIMEOUT", "60"))
