"""
Memory Intent Classifier Engine Subsystem
Classifies user utterances into 4 distinct conversation intents:
1. MEMORY_RECALL: Explicit user requests for memory recall (Mode: EXPLICIT_RECALL)
2. MEMORY_CONTINUATION: Continuation about existing remembered entities (Mode: SILENT_BACKGROUND)
3. MEMORY_UPDATE: Updating information about an existing memory (Mode: UPDATE_BACKGROUND)
4. NEW_MEMORY: Introducing new information to be stored (Mode: NEW_STATEMENT)
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, List, Optional, Set


class MemoryIntent(str, Enum):
    MEMORY_RECALL = "MEMORY_RECALL"
    MEMORY_CONTINUATION = "MEMORY_CONTINUATION"
    MEMORY_UPDATE = "MEMORY_UPDATE"
    NEW_MEMORY = "NEW_MEMORY"


class MemoryUsageMode(str, Enum):
    EXPLICIT_RECALL = "EXPLICIT_RECALL"
    SILENT_BACKGROUND = "SILENT_BACKGROUND"
    UPDATE_BACKGROUND = "UPDATE_BACKGROUND"
    NEW_STATEMENT = "NEW_STATEMENT"


@dataclass
class MemoryIntentResult:
    intent: MemoryIntent
    mode: MemoryUsageMode
    retrieved: bool
    updated: bool
    stored: bool
    explanation: str


class MemoryIntentEngine:
    """
    Pure Intent Classifier Engine.
    Evaluates user message against stored user memories and linguistic patterns to determine
    the exact memory usage mode.
    """

    RECALL_PATTERNS = [
        re.compile(r"\b(?:do you remember|remember|recall|who is|who's|what do you know|tell me what you remember)\b", re.IGNORECASE),
        re.compile(r"\b(?:what is my|what's my|what are my)\s+(?:favourite|favorite|goal|goals|job|work|colour|color|name)\b", re.IGNORECASE),
        re.compile(r"\b(?:what do you know about me)\b", re.IGNORECASE),
    ]

    UPDATE_PATTERNS = [
        re.compile(r"\b(?:got married|moved away|no longer|is now|changed to|passed away|divorced|quit|promoted|broke up|separated)\b", re.IGNORECASE),
    ]

    NEW_MEMORY_PATTERNS = [
        re.compile(r"\b(?:i have a|i met|my name is|i work at|i work as|i live in|i want to|my goal is|my favourite|my favorite)\b", re.IGNORECASE),
    ]

    def classify_intent(
        self,
        user_message: str,
        existing_memories: Optional[List[Any]] = None,
    ) -> MemoryIntentResult:
        """
        Classify user message into one of 4 memory intents and assign corresponding MemoryUsageMode.
        """
        msg_clean = user_message.strip()
        msg_lower = msg_clean.lower()

        # Extract entity words from existing memories
        stored_entities: Set[str] = set()
        if existing_memories:
            for mem in existing_memories:
                content = getattr(mem, "content", "") if hasattr(mem, "content") else str(mem)
                words = [w.strip(".,!?").lower() for w in content.split() if len(w) > 2]
                stored_entities.update(words)

        # 1. Check for MEMORY_RECALL
        for pat in self.RECALL_PATTERNS:
            if pat.search(msg_lower):
                return MemoryIntentResult(
                    intent=MemoryIntent.MEMORY_RECALL,
                    mode=MemoryUsageMode.EXPLICIT_RECALL,
                    retrieved=True,
                    updated=False,
                    stored=False,
                    explanation="User explicitly requested memory recall.",
                )

        # 2. Check for MEMORY_UPDATE
        for pat in self.UPDATE_PATTERNS:
            if pat.search(msg_lower):
                return MemoryIntentResult(
                    intent=MemoryIntent.MEMORY_UPDATE,
                    mode=MemoryUsageMode.UPDATE_BACKGROUND,
                    retrieved=True,
                    updated=True,
                    stored=False,
                    explanation="User provided updated status for existing memory.",
                )

        # Check if query mentions any existing stored entity or memory word
        query_words = [w.strip(".,!?").lower() for w in msg_lower.split() if len(w) > 2]
        matches_existing = any(qw in stored_entities for qw in query_words)

        # 3. Check for NEW_MEMORY
        for pat in self.NEW_MEMORY_PATTERNS:
            if pat.search(msg_lower) and not matches_existing:
                return MemoryIntentResult(
                    intent=MemoryIntent.NEW_MEMORY,
                    mode=MemoryUsageMode.NEW_STATEMENT,
                    retrieved=False,
                    updated=False,
                    stored=True,
                    explanation="User introduced new statement/entity.",
                )

        # 4. Check for MEMORY_CONTINUATION
        if matches_existing or len(stored_entities) > 0:
            return MemoryIntentResult(
                intent=MemoryIntent.MEMORY_CONTINUATION,
                mode=MemoryUsageMode.SILENT_BACKGROUND,
                retrieved=True,
                updated=False,
                stored=False,
                explanation="User continued conversation about existing entity/context.",
            )

        # Default fallback: Treat as NEW_MEMORY / natural turn
        return MemoryIntentResult(
            intent=MemoryIntent.NEW_MEMORY,
            mode=MemoryUsageMode.NEW_STATEMENT,
            retrieved=False,
            updated=False,
            stored=True,
            explanation="Default statement processing.",
        )
