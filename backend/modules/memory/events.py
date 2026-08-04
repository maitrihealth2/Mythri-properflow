"""
Memory Event Subsystem
Defines event notification interfaces and event point hooks for future memory processing.
"""
from abc import ABC, abstractmethod
from typing import Callable, Dict, List
from modules.memory.types import MemoryEvent, MemoryEventType


class MemoryEventHandlerProtocol(ABC):
    """Protocol for event subscriber handlers."""

    @abstractmethod
    def handle_event(self, event: MemoryEvent) -> None:
        """Handle a dispatched memory event."""
        pass


class MemoryEventDispatcher:
    """
    Central event registry for memory lifecycle hooks.
    Allows future modules to subscribe to lifecycle events without coupling.
    """

    def __init__(self):
        self._subscribers: Dict[MemoryEventType, List[Callable[[MemoryEvent], None]]] = {
            event_type: [] for event_type in MemoryEventType
        }

    def subscribe(
        self, event_type: MemoryEventType, handler: Callable[[MemoryEvent], None]
    ) -> None:
        """Register a handler for a specific memory event type."""
        if event_type in self._subscribers:
            self._subscribers[event_type].append(handler)

    def dispatch(self, event: MemoryEvent) -> None:
        """Dispatch a memory event to all registered handlers (no-op if none)."""
        handlers = self._subscribers.get(event.event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                # Event dispatch errors must never break caller execution
                print(f"[MemoryEventDispatcher] Handler error for {event.event_type}: {e}")
