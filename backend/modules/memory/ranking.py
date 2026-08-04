"""
Memory Ranking Engine Subsystem
Evaluates candidate memories returned by MemoryRetrievalEngine across modular relevance signals
(recency, importance, confidence, topic similarity, emotional similarity, preference relevance, goal relevance, access frequency).
Assigns factor scores, calculates weighted total relevance scores, ranks candidate items, and separates low-confidence candidates.
Contains zero prompt assembly, zero context building, and zero LLM calls.
"""
import math
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from modules.memory.domain import MemoryCategory, MemoryEntity
from modules.memory.episodic import EpisodicExperience
from modules.memory.retrieval import RetrievalResult
from modules.memory.short_term import ShortTermMemoryItem, WorkingMemoryKind


@dataclass
class RankingWeights:
    """
    Configurable scoring weights for relevance signal factors.
    Externalized configuration preventing magic numbers.
    """
    recency_weight: float = 0.15
    importance_weight: float = 0.20
    confidence_weight: float = 0.15
    topic_weight: float = 0.20
    emotion_weight: float = 0.10
    preference_weight: float = 0.10
    goal_weight: float = 0.05
    access_weight: float = 0.05
    min_relevance_threshold: float = 0.30

    def normalize(self) -> "RankingWeights":
        """Returns a weight configuration normalized to sum to 1.0."""
        total = (
            self.recency_weight
            + self.importance_weight
            + self.confidence_weight
            + self.topic_weight
            + self.emotion_weight
            + self.preference_weight
            + self.goal_weight
            + self.access_weight
        )
        if total <= 0:
            return self
        return RankingWeights(
            recency_weight=self.recency_weight / total,
            importance_weight=self.importance_weight / total,
            confidence_weight=self.confidence_weight / total,
            topic_weight=self.topic_weight / total,
            emotion_weight=self.emotion_weight / total,
            preference_weight=self.preference_weight / total,
            goal_weight=self.goal_weight / total,
            access_weight=self.access_weight / total,
            min_relevance_threshold=self.min_relevance_threshold,
        )


@dataclass
class RankedCandidate:
    """
    Scored and ordered candidate memory container with factor breakdowns and ranking explanations.
    """
    candidate: Any
    candidate_id: str
    candidate_type: str  # "long_term", "episodic", "short_term"
    content: str
    total_score: float
    factor_scores: Dict[str, float] = field(default_factory=dict)
    ranking_explanation: str = ""
    final_rank: int = 0


@dataclass
class RankingResult:
    """
    Actionable output payload produced by MemoryRankingEngine.
    Exposes ranked candidates ordered by relevance score, discarded low-score items, timing, and statistics.
    """
    ranked_candidates: List[RankedCandidate] = field(default_factory=list)
    discarded_candidates: List[RankedCandidate] = field(default_factory=list)
    duration_ms: float = 0.0
    statistics: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def top_candidate(self) -> Optional[RankedCandidate]:
        """Return the highest ranked candidate if available."""
        return self.ranked_candidates[0] if self.ranked_candidates else None


class MemoryRankingEngine:
    """
    Pure Memory Ranking Engine.
    Evaluates candidates from RetrievalResult across modular relevance signals using configurable weights.
    """

    def __init__(self, default_weights: Optional[RankingWeights] = None):
        self.weights = (default_weights or RankingWeights()).normalize()

    def rank_candidates(
        self,
        retrieval_result: RetrievalResult,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        weights: Optional[RankingWeights] = None,
    ) -> RankingResult:
        """
        Rank candidate memories from RetrievalResult across modular relevance signals with failure isolation.
        """
        start_time = time.time()
        active_weights = (weights or self.weights).normalize()
        context_dict = context or {}

        import re
        query_lower = query.strip().lower()
        clean_query = re.sub(r"[^\w\s]", " ", query_lower)
        query_terms = set(t for t in clean_query.split() if len(t) > 2)
        target_emotion = context_dict.get("current_emotion", "").lower()

        # Check for explicit recall intent
        recall_keywords = ["remember", "recall", "know about", "tell me", "what do you know", "favourite", "favorite", "goals", "who", "girl", "person"]
        is_recall_query = any(kw in query_lower for kw in recall_keywords)

        scored_list: List[RankedCandidate] = []
        discarded_list: List[RankedCandidate] = []
        errors: List[str] = []
        warnings: List[str] = []

        # Combine candidate items into candidate processing tuples: (candidate_obj, type_str, id_str, content_str, created_at)
        candidate_pool: List[Tuple[Any, str, str, str, datetime]] = []

        # 1. Collect Long-Term Memory Candidates
        for entity in retrieval_result.long_term_candidates:
            cid = str(entity.metadata.memory_id or hash(entity.content))
            candidate_pool.append((entity, "long_term", cid, entity.content, entity.metadata.created_at))

        # 2. Collect Episodic Memory Candidates
        for ep in retrieval_result.episodic_candidates:
            cid = str(ep.episode_id or hash(ep.primary_emotion))
            content_desc = f"Session {ep.session_id} [{ep.primary_emotion}]: {', '.join(ep.active_topics)}"
            candidate_pool.append((ep, "episodic", cid, content_desc, ep.start_time))

        # 3. Collect Short-Term Memory Candidates
        for st_item in retrieval_result.short_term_candidates:
            cid = str(st_item.item_id)
            candidate_pool.append((st_item, "short_term", cid, st_item.content, st_item.created_at))

        # 4. Score Candidate Items (with Failure Isolation)
        effective_min_threshold = 0.15 if is_recall_query else active_weights.min_relevance_threshold

        for obj, ctype, cid, content_str, created_dt in candidate_pool:
            try:
                topic_sim = self._score_topic_similarity(content_str, query_terms)
                if is_recall_query:
                    # Boost topic similarity if any query term is contained in memory content string
                    if any(term in content_str.lower() for term in query_terms if term not in {"remember", "what", "know", "tell", "about", "you"}):
                        topic_sim = max(topic_sim, 0.90)
                    else:
                        topic_sim = max(topic_sim, 0.60)

                factors: Dict[str, float] = {
                    "recency": self._score_recency(created_dt),
                    "importance": self._score_importance(obj),
                    "confidence": self._score_confidence(obj),
                    "topic_similarity": topic_sim,
                    "emotional_similarity": self._score_emotional_similarity(obj, target_emotion),
                    "preference_relevance": self._score_preference_relevance(obj),
                    "goal_relevance": self._score_goal_relevance(obj),
                    "access_frequency": self._score_access_frequency(obj),
                }

                total_score = (
                    factors["recency"] * active_weights.recency_weight
                    + factors["importance"] * active_weights.importance_weight
                    + factors["confidence"] * active_weights.confidence_weight
                    + factors["topic_similarity"] * active_weights.topic_weight
                    + factors["emotional_similarity"] * active_weights.emotion_weight
                    + factors["preference_relevance"] * active_weights.preference_weight
                    + factors["goal_relevance"] * active_weights.goal_weight
                    + factors["access_frequency"] * active_weights.access_weight
                )

                total_score = round(min(1.0, max(0.0, total_score)), 4)

                top_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)[:2]
                explanation = f"Score: {total_score:.2f} | Key signals: {top_factors[0][0]} ({top_factors[0][1]:.2f}), {top_factors[1][0]} ({top_factors[1][1]:.2f})"

                ranked_item = RankedCandidate(
                    candidate=obj,
                    candidate_id=cid,
                    candidate_type=ctype,
                    content=content_str,
                    total_score=total_score,
                    factor_scores=factors,
                    ranking_explanation=explanation,
                )

                if total_score >= effective_min_threshold:
                    scored_list.append(ranked_item)
                else:
                    discarded_list.append(ranked_item)

            except Exception as e:
                errors.append(f"Scoring failed for candidate ID {cid} ({ctype}): {str(e)}")

        # 5. Order Candidates by Total Score Descending & Assign Ranks
        scored_list.sort(key=lambda x: x.total_score, reverse=True)
        for idx, item in enumerate(scored_list, start=1):
            item.final_rank = idx

        # Trigger Future Extension Point Stubs
        self._semantic_similarity_stub(query)
        self._embedding_similarity_stub(query)
        self._graph_proximity_stub(query)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        stats = {
            "total_candidates_processed": len(candidate_pool),
            "ranked_count": len(scored_list),
            "discarded_count": len(discarded_list),
            "top_score": scored_list[0].total_score if scored_list else 0.0,
            "min_threshold_applied": active_weights.min_relevance_threshold,
        }

        return RankingResult(
            ranked_candidates=scored_list,
            discarded_candidates=discarded_list,
            duration_ms=duration_ms,
            statistics=stats,
            warnings=warnings,
            errors=errors,
        )

    # ── Factor Scoring Implementations ───────────────────────────────────────

    def _score_recency(self, created_at: datetime) -> float:
        """Exponential decay score based on time elapsed since creation (~7 day half-life)."""
        if created_at is None:
            return 0.5
        if created_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=None)
        now = datetime.utcnow()
        delta_days = max(0.0, (now - created_at).total_seconds() / 86400.0)
        return round(math.exp(-delta_days / 7.0), 4)

    def _score_importance(self, candidate: Any) -> float:
        """Extract or default importance score (0.0 - 1.0)."""
        if isinstance(candidate, MemoryEntity):
            return candidate.metadata.importance
        return 0.50

    def _score_confidence(self, candidate: Any) -> float:
        """Extract or default confidence score (0.0 - 1.0)."""
        if isinstance(candidate, MemoryEntity):
            return candidate.metadata.confidence
        elif isinstance(candidate, EpisodicExperience):
            return candidate.confidence
        return 0.90

    def _score_topic_similarity(self, content_str: str, query_terms: Set[str]) -> float:
        """Jaccard term overlap score between content and query terms."""
        if not query_terms:
            return 0.50
        content_terms = set(t.lower() for t in content_str.split() if len(t) > 2)
        if not content_terms:
            return 0.0
        intersection = query_terms.intersection(content_terms)
        return round(len(intersection) / len(query_terms), 4)

    def _score_emotional_similarity(self, candidate: Any, target_emotion: str) -> float:
        """Emotional similarity match between candidate and target session emotion."""
        if not target_emotion:
            return 0.50
        if isinstance(candidate, EpisodicExperience):
            if candidate.primary_emotion.lower() == target_emotion:
                return 1.0
            elif target_emotion in [e.lower() for e in candidate.emotional_arc]:
                return 0.80
        elif isinstance(candidate, ShortTermMemoryItem) and candidate.kind == WorkingMemoryKind.EMOTIONAL_STATE:
            if candidate.content.lower() == target_emotion:
                return 1.0
        return 0.30

    def _score_preference_relevance(self, candidate: Any) -> float:
        """Bonus score if candidate represents a user preference."""
        if isinstance(candidate, MemoryEntity) and candidate.metadata.category == MemoryCategory.PREFERENCE:
            return 1.0
        elif isinstance(candidate, ShortTermMemoryItem) and candidate.kind == WorkingMemoryKind.TEMPORARY_PREFERENCE:
            return 0.90
        return 0.20

    def _score_goal_relevance(self, candidate: Any) -> float:
        """Bonus score if candidate represents an active goal."""
        if isinstance(candidate, MemoryEntity) and candidate.metadata.category == MemoryCategory.GOAL:
            return 1.0
        elif isinstance(candidate, ShortTermMemoryItem) and candidate.kind == WorkingMemoryKind.SESSION_GOAL:
            return 0.90
        return 0.20

    def _score_access_frequency(self, candidate: Any) -> float:
        """Frequency score based on memory access count."""
        if isinstance(candidate, MemoryEntity):
            return min(1.0, candidate.metadata.access_count / 10.0)
        return 0.10

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _semantic_similarity_stub(self, query: str) -> None:
        """Extension Point Stub: Hook for future semantic vector similarity scoring."""
        pass

    def _embedding_similarity_stub(self, query: str) -> None:
        """Extension Point Stub: Hook for future dense embedding cosine similarity."""
        pass

    def _graph_proximity_stub(self, query: str) -> None:
        """Extension Point Stub: Hook for future Knowledge Graph graph distance scoring."""
        pass

    def _reflection_weighting_stub(self, query: str) -> None:
        """Extension Point Stub: Hook for future reflection memory bonus weighting."""
        pass

    def _therapist_weighting_stub(self, query: str) -> None:
        """Extension Point Stub: Hook for future clinician / therapist override weighting."""
        pass
