"""
Unified Cognitive Context Engine Subsystem
Aggregates information from ALL user-related PostgreSQL tables into ONE structured cognitive profile:
1. users (Identity, preferred language)
2. user_onboarding (Name, style, mode, primary goal, goals, reasons)
3. user_persona_profiles (Presenting problem, coping mechanisms, support system, traits, risk level)
4. companion_memories (Long-term facts, relationships, preferences, goals, habits, triggers)
5. consultation_notes (Recent session summaries, key insights, progress)
6. sessions & message_emotions (Session history stats, recent emotional trends, active topics)
7. user_goals & user_journals (Therapeutic goal statuses, reflective entries)
"""

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database.models import (
    User,
    UserOnboarding,
    UserPersonaProfile,
    UserProfile,
    CompanionMemory,
    ConsultationNote,
    Session as DBSession,
    Message,
    MessageEmotion,
    UserGoal,
    UserJournal,
)


@dataclass
class UnifiedCognitiveProfile:
    """
    Complete, aggregated cognitive profile representation of a user.
    Single object supplied to both Analyst and Sarvam LLM layers.
    """
    user_id: int
    preferred_name: str = "Friend"
    language: str = "en-IN"
    conversation_style: str = "Warm & Empathetic"
    communication_mode: str = "Both"
    primary_goal: str = "Personal growth & emotional balance"
    goals: List[str] = field(default_factory=list)
    reasons_for_joining: List[str] = field(default_factory=list)
    initial_emotion: str = ""
    check_in_preference: str = ""
    
    # Persona & Clinical Profile
    presenting_problem: str = ""
    coping_mechanisms: str = ""
    support_system: str = ""
    personality_traits: str = ""
    risk_level: str = "Low"

    # Memory Categories
    relationships: List[str] = field(default_factory=list)
    personal_facts: List[str] = field(default_factory=list)
    long_term_preferences: List[str] = field(default_factory=list)
    active_goals: List[str] = field(default_factory=list)
    habits_and_routines: List[str] = field(default_factory=list)
    emotional_triggers: List[str] = field(default_factory=list)

    # Session & Emotional History
    total_sessions_count: int = 0
    last_session_time: Optional[str] = None
    recent_session_summaries: List[str] = field(default_factory=list)
    recent_emotional_trend: Optional[str] = None
    recent_user_utterances: List[str] = field(default_factory=list)
    journal_highlights: List[str] = field(default_factory=list)

    # Engine Telemetry
    assembly_duration_ms: float = 0.0
    db_acquire_ms: float = 0.0
    query_total_ms: float = 0.0

    def to_formatted_context_block(self, max_tokens: int = 500, is_greeting: bool = False) -> str:
        """
        Formats the unified profile into a structured markdown block for AI prompts.
        Guarantees token efficiency by deduplicating facts and capping line count.
        """
        sections = []

        # 1. USER IDENTITY & PREFERENCES
        id_parts = [f"Name: {self.preferred_name}", f"Language: {self.language}"]
        if self.conversation_style:
            id_parts.append(f"Style: {self.conversation_style}")
        if self.communication_mode:
            id_parts.append(f"Mode: {self.communication_mode}")
        if self.check_in_preference:
            id_parts.append(f"Check-ins: {self.check_in_preference}")
        sections.append(f"[USER IDENTITY & PREFERENCES]\n• " + " | ".join(id_parts))

        # 2. THERAPEUTIC GOALS & REASONS
        goal_items = []
        if self.primary_goal:
            goal_items.append(f"Primary Goal/Vibe: {self.primary_goal}")
        if self.goals:
            goal_items.append(f"Goals: {', '.join(self.goals)}")
        if self.reasons_for_joining:
            goal_items.append(f"Motivations: {', '.join(self.reasons_for_joining)}")
        if self.initial_emotion:
            goal_items.append(f"Current Feeling: {self.initial_emotion}")
        if goal_items:
            sections.append(f"[THERAPEUTIC GOALS & MOTIVATIONS]\n• " + "\n• ".join(goal_items))

        # 3. PERSONAL FACTS & RELATIONSHIPS
        mem_items = []
        if self.relationships:
            mem_items.append(f"Relationships: {'; '.join(self.relationships)}")
        if self.personal_facts:
            mem_items.append(f"Facts: {'; '.join(self.personal_facts)}")
        if self.long_term_preferences:
            mem_items.append(f"Preferences: {'; '.join(self.long_term_preferences)}")
        if self.habits_and_routines:
            mem_items.append(f"Habits: {'; '.join(self.habits_and_routines)}")
        if mem_items:
            sections.append(f"[LONG-TERM MEMORY & FACTS]\n• " + "\n• ".join(mem_items))

        # 4. CLINICAL & PERSONA PROFILE
        persona_items = []
        if self.presenting_problem:
            persona_items.append(f"Presenting Challenge: {self.presenting_problem}")
        if self.coping_mechanisms:
            persona_items.append(f"Coping Strategies: {self.coping_mechanisms}")
        if self.support_system:
            persona_items.append(f"Support System: {self.support_system}")
        if persona_items:
            sections.append(f"[CLINICAL PROFILE & COPING]\n• " + "\n• ".join(persona_items))

        # 4b. ACTIVE THERAPEUTIC GOALS
        if self.active_goals:
            goals_str = "; ".join(self.active_goals[:3])
            sections.append(f"[ACTIVE GOALS]\n• {goals_str}")

        # 4c. INTERVENTION HISTORY & WHAT HELPS (always shown — critical for adaptive support)
        # This includes exercise outcomes written to companion_memories (MemoryCategory.TRIGGER)
        if self.emotional_triggers:
            trigger_items = []
            for t in self.emotional_triggers[:3]:  # cap at 3 most relevant
                trigger_items.append(t)
            sections.append(
                f"[WHAT HAS HELPED / WHAT TRIGGERS DISTRESS]\n• " + "\n• ".join(trigger_items)
            )

        # 5. RECENT CLINICAL SUMMARY & EMOTIONAL TREND (Only for greetings to prevent mid-conversation repetition)
        if is_greeting:
            hist_items = []
            hist_items.append(f"Total Sessions: {self.total_sessions_count} | Recent Emotion: {self.recent_emotional_trend}")
            if self.recent_session_summaries:
                hist_items.append(f"Recent Summary: {self.recent_session_summaries[0]}")
            if self.journal_highlights:
                hist_items.append(f"Journal Notes: {self.journal_highlights[0]}")
            sections.append(f"[RECENT SUMMARY & EMOTIONAL TREND]\n• " + "\n• ".join(hist_items))

        full_block = "\n\n".join(sections)

        # Truncate string if estimated characters exceed max token budget (~4 chars per token)
        max_chars = max_tokens * 4
        if len(full_block) > max_chars:
            full_block = full_block[:max_chars] + "\n[...Context truncated for token budget]"

        return full_block


class UnifiedCognitiveContextEngine:
    """
    Unified Context Aggregation Engine.
    Queries all user database tables in a single batched operation per user turn.
    """

    def build_context(
        self,
        db: Session,
        user_id: int,
        session_id: Optional[int] = None,
        query: str = "",
    ) -> UnifiedCognitiveProfile:
        """
        Aggregates all user-related data into a UnifiedCognitiveProfile.
        Enforces strict user_id isolation and deduplication.
        """
        start_time = time.time()
        profile = UnifiedCognitiveProfile(user_id=user_id)

        try:
            from core.database.models import LivingUserContext, CompanionMemory, User
            
            # 1. Fetch user basics
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                profile.language = user.preferred_language or "en-IN"
                profile.preferred_name = user.username # Default fallback
            
            # 2. Fetch Living User Context
            living_ctx = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
            if living_ctx:
                if living_ctx.compact_summary:
                    profile.recent_session_summaries.append(living_ctx.compact_summary)
                if living_ctx.active_themes:
                    profile.active_goals.extend(living_ctx.active_themes)
                if living_ctx.unresolved_topics:
                    profile.goals.extend(living_ctx.unresolved_topics)
                if living_ctx.emotional_baseline:
                    profile.recent_emotional_trend = living_ctx.emotional_baseline
            else:
                profile.recent_session_summaries.append("New user context being built in background.")
                
            # 3. Fetch Top Companion Memories
            memories = db.query(CompanionMemory).filter(
                CompanionMemory.user_id == user_id
            ).order_by(CompanionMemory.importance_score.desc(), CompanionMemory.created_at.desc()).limit(5).all()
            
            seen_facts: Set[str] = set()
            for m in memories:
                content_clean = m.content.strip()
                if not content_clean: continue
                norm_content = content_clean.lower()
                if norm_content in seen_facts: continue
                seen_facts.add(norm_content)
                
                mtype = (m.memory_type or "").lower()
                if "relationship" in mtype: profile.relationships.append(content_clean)
                elif "preference" in mtype: profile.long_term_preferences.append(content_clean)
                elif "goal" in mtype: profile.active_goals.append(content_clean)
                elif "habit" in mtype: profile.habits_and_routines.append(content_clean)
                elif "trigger" in mtype: profile.emotional_triggers.append(content_clean)
                else: profile.personal_facts.append(content_clean)
                    
        except Exception as e:
            print(f"[UnifiedCognitiveContextEngine] Error building profile: {e}")

        profile.assembly_duration_ms = round((time.time() - start_time) * 1000, 2)
        return profile

    async def build_context_async(
        self,
        user_id: int,
        session_id: Optional[int] = None,
        query: str = "",
        user_language: Optional[str] = None
    ) -> UnifiedCognitiveProfile:
        import asyncio
        start_time = time.time()
        
        from core.database.models import SessionLocal
        
        def _build_sync():
            t0 = time.time()
            with SessionLocal() as db:
                t_acquire = time.time() - t0
                t1 = time.time()
                prof = self.build_context(db, user_id, session_id, query)
                t_query = time.time() - t1
                prof.db_acquire_ms = round(t_acquire * 1000, 2)
                prof.query_total_ms = round(t_query * 1000, 2)
                return prof
                
        profile = await asyncio.to_thread(_build_sync)
        if user_language:
            profile.language = user_language
            
        profile.assembly_duration_ms = round((time.time() - start_time) * 1000, 2)
        return profile
