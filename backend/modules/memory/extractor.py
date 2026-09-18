"""
Memory Extraction Engine
Pure domain component responsible for distilling candidate memories from user conversation turns.
Does not store, retrieve, call LLMs, or execute persistence operations.
"""
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from modules.memory.contracts import MemoryExtractorProtocol
from modules.memory.types import MemoryItem
from modules.memory.domain import (
    MemoryCategory,
    MemoryEntity,
    MemoryKind,
    MemoryMetadata,
    MemorySource,
    MemoryStatus,
)
from modules.memory.policies import MemoryQualityPolicy


@dataclass
class ExtractionCandidate:
    """
    Intermediate representation of a candidate memory before validation & storage.
    Includes full source traceability and confidence preparation signals.
    """
    category: MemoryCategory
    extracted_fact: str
    raw_trigger_phrase: str
    user_id: int
    origin_session_id: Optional[int] = None
    confidence_signals: Dict[str, Any] = field(default_factory=dict)
    extracted_at: datetime = field(default_factory=datetime.utcnow)

    def to_domain_entity(self, importance: float = 0.5) -> MemoryEntity:
        """Convert extraction candidate into a canonical MemoryEntity."""
        metadata = MemoryMetadata(
            user_id=self.user_id,
            memory_kind=MemoryKind.LONG_TERM,
            category=self.category,
            importance=importance,
            confidence=float(self.confidence_signals.get("initial_confidence", 0.85)),
            created_at=self.extracted_at,
            updated_at=self.extracted_at,
            source=MemorySource.DIRECT_USER_STATEMENT,
            origin_session=self.origin_session_id,
            status=MemoryStatus.CANDIDATE,
            extra={
                "raw_trigger_phrase": self.raw_trigger_phrase,
                "confidence_signals": self.confidence_signals,
            },
        )
        return MemoryEntity(content=self.extracted_fact, metadata=metadata)


class MemoryExtractor(MemoryExtractorProtocol):
    """
    Pure memory extraction engine.
    Uses structural & linguistic pattern matchers to identify facts, preferences, goals,
    relationships, habits, and emotional triggers from user utterances.
    """

    # Category Pattern Specifications: (Category, Regex Pattern, Importance Default)
    PATTERNS: List[Tuple[MemoryCategory, re.Pattern, float]] = [
        (
            MemoryCategory.FACT,
            re.compile(
                r"\b(?:my\s+name\s+is|call\s+me|i\s+am\s+named|mera\s+naam\s+|i\s+(?:work\s+as|work\s+at|work\s+in|work\s+for|live\s+in|am\s+from|study\s+at|study|have\s+been\s+diagnosed\s+with|was\s+born\s+in|am\s+a|am\s+an|have|am))\s+(.*)",
                re.IGNORECASE,
            ),
            0.85,
        ),
        (
            MemoryCategory.GOAL,
            re.compile(
                r"\b(?:my\s+goal\s+is(?:\s+to)?|goal\s+is\s+to|i\s+(?:want\s+to|hope\s+to|am\s+trying\s+to|plan\s+to|wish\s+to|aim\s+to|am\s+working\s+towards))\s+(.*)",
                re.IGNORECASE,
            ),
            0.80,
        ),
        (
            MemoryCategory.PREFERENCE,
            re.compile(
                r"\b(?:my\s+(?:favourite|favorite)\s+\w+\s+is|i\s+(?:prefer|love|like|enjoy|hate|don't\s+like|dislike|can't\s+stand|feel\s+better\s+when))\s+(.*)",
                re.IGNORECASE,
            ),
            0.75,
        ),
        (
            MemoryCategory.RELATIONSHIP,
            re.compile(
                r"\b(?:my\s+(?:brother|sister|mother|father|mom|dad|friend|boss|partner|wife|husband|doctor|therapist|colleague|teacher|son|daughter|girl|guy|crush|ex|boyfriend|girlfriend|person|classmate|roommate|neighbor|coworker|relative|uncle|aunt|dog|cat|pet)|meri\s+(?:dost|friend|behen|sister|mummy|maa)|mera\s+(?:dost|friend|bhai|brother|papa)|met\s+(?:a\s+)?(?:girl|guy|person|friend|[A-Z]\w+|\w+)|talking\s+to\s+(?:a\s+)?(?:girl|guy|person|[A-Z]\w+|\w+)|there's\s+a\s+(?:girl|guy|person))\b(?:\s+is|\s+named|\s+called|\s+who)?\s*(.*)",
                re.IGNORECASE,
            ),
            0.85,
        ),
        (
            MemoryCategory.HABIT,
            re.compile(
                r"\b(?:every\s+(?:day|week|morning|night|weekend|evening)|daily|i\s+(?:usually|always|never|often|regularly))\s+(.*)",
                re.IGNORECASE,
            ),
            0.60,
        ),
        (
            MemoryCategory.TRIGGER,
            re.compile(
                r"\b(?:makes\s+me\s+feel|i\s+feel\s+(?:anxious|overwhelmed|panicked|depressed|scared|upset|stressed)\s+when|stresses\s+me\s+out|triggers\s+my)\s+(.*)",
                re.IGNORECASE,
            ),
            0.85,
        ),
    ]

    def extract_candidates(
        self,
        user_message: str,
        user_id: int,
        session_id: Optional[int] = None,
    ) -> List[ExtractionCandidate]:
        """
        Analyze a user utterance and return candidate memory extractions.
        Applies MemoryQualityPolicy exclusion rules.
        """
        candidates: List[ExtractionCandidate] = []

        # Step 1: Quality & Exclusion Policy Check
        if not MemoryQualityPolicy.should_extract(user_message):
            return candidates

        clean_text = user_message.strip()

        # Step 2: Structural Pattern Matching
        for category, pattern, default_importance in self.PATTERNS:
            match = pattern.search(clean_text)
            if match:
                matched_phrase = match.group(0).strip()
                
                # Confidence Preparation Signals
                confidence_signals = {
                    "initial_confidence": 0.85,
                    "pattern_matched": category.value,
                    "length": len(matched_phrase),
                    "direct_statement": True,
                }

                candidate = ExtractionCandidate(
                    category=category,
                    extracted_fact=matched_phrase,
                    raw_trigger_phrase=clean_text[:150],
                    user_id=user_id,
                    origin_session_id=session_id,
                    confidence_signals=confidence_signals,
                )
                candidates.append(candidate)

        return candidates

    def extract_memories(
        self,
        user_id: int,
        user_message: str,
        assistant_response: str = "",
        session_id: Optional[int] = None,
    ) -> List[MemoryItem]:
        """
        Interface implementation fulfilling MemoryExtractorProtocol.
        Translates candidates into MemoryItem instances without executing any storage operations.
        """
        candidates = self.extract_candidates(user_message, user_id, session_id=session_id)
        memory_items: List[MemoryItem] = []

        for cand in candidates:
            domain_entity = cand.to_domain_entity()
            # Convert to foundation MemoryItem struct
            item = MemoryItem(
                user_id=user_id,
                memory_type=MemoryKind.LONG_TERM,
                category=cand.category,
                content=domain_entity.content,
                importance_score=domain_entity.metadata.importance,
                confidence_score=domain_entity.metadata.confidence,
                created_at=domain_entity.metadata.created_at,
                updated_at=domain_entity.metadata.updated_at,
                metadata=domain_entity.metadata.extra,
            )
            memory_items.append(item)

        return memory_items
