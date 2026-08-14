"""
Typed exception hierarchy for Mythri LLM providers.

Exceptions are classified into two categories:
  - Failover exceptions: trigger automatic switch to secondary provider.
  - Configuration exceptions: surface immediately as errors (no failover).
"""


class ProviderError(Exception):
    """Base class for all Mythri LLM provider errors."""
    pass


# ---------------------------------------------------------------------------
# FAILOVER exceptions — router will retry with secondary provider
# ---------------------------------------------------------------------------

class ProviderTimeoutError(ProviderError):
    """Provider did not respond within the configured timeout."""
    pass


class ProviderRateLimitError(ProviderError):
    """Provider returned HTTP 429 — rate limit exceeded."""
    pass


class ProviderServerError(ProviderError):
    """Provider returned HTTP 5xx — server-side error."""
    pass


class ProviderNetworkError(ProviderError):
    """Network-level failure: connection refused, DNS error, etc."""
    pass


class ProviderStreamError(ProviderError):
    """Streaming was interrupted or produced malformed data."""
    pass


class ProviderEmptyResponseError(ProviderError):
    """Provider returned a well-formed response but with no usable content."""
    pass


# ---------------------------------------------------------------------------
# NON-FAILOVER exceptions — reported as configuration errors immediately
# ---------------------------------------------------------------------------

class ProviderConfigurationError(ProviderError):
    """
    Bad API key (401), bad request (400), or invalid configuration.
    These are NOT subject to automatic failover — they indicate a bug or
    misconfiguration that retrying with a different provider won't fix.
    """
    pass
