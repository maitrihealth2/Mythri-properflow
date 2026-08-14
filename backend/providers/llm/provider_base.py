"""
Abstract base class for all Maitri LLM providers.

Every provider must
implement this interface so the router can treat them interchangeably.
"""
from abc import ABC, abstractmethod


class LLMProviderBase(ABC):
    """Abstract interface for a streaming LLM provider."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name used in telemetry logs."""
        ...

    @property
    @abstractmethod
    def model(self) -> str:
        """Model identifier used for this provider."""
        ...

    @abstractmethod
    async def generate(
        self,
        api_messages: list[dict],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """
        Stream a completion from the provider and return the accumulated text.

        Args:
            api_messages: Full message list including system prompt.
            max_tokens: Maximum tokens to generate.
            temperature: Sampling temperature.

        Returns:
            The full response text as a string.

        Raises:
            ProviderTimeoutError, ProviderRateLimitError, ProviderServerError,
            ProviderNetworkError, ProviderStreamError, ProviderEmptyResponseError,
            ProviderConfigurationError — see exceptions.py.
        """
        ...

    @abstractmethod
    async def close(self) -> None:
        """Release any underlying HTTP connections."""
        ...
