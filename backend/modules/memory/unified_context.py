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
    Structured into three distinct cognitive tiers:
    1. Episodic Memory (Current Session / Active Episode)
    2. Short-Term Memory (Recent Times / Past 1-3 Sessions)
    3. Long-Term Memory (Deep Past Spoken Content & Core Identity)
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
    onboarding_summary: str = ""
    
    # ── 1. EPISODIC MEMORY (Current Active Session) ──────────────────────────
    current_session_id: Optional[int] = None
    current_session_topics: List[str] = field(default_factory=list)
    current_session_emotion: Optional[str] = None
    current_session_working_facts: List[str] = field(default_factory=list)
    current_session_goal: Optional[str] = None

    # ── 2. SHORT-TERM MEMORY (Recent Times / Past 1-3 Sessions) ──────────────
    recent_session_summaries: List[str] = field(default_factory=list)
    recent_emotional_trend: Optional[str] = None
    living_context_summary: Optional[str] = None
    unresolved_topics: List[str] = field(default_factory=list)
    active_goals: List[str] = field(default_factory=list)

    # ── 3. LONG-TERM MEMORY (Core Profile & Deep Historical Spoken Content) ──
    personal_facts: List[str] = field(default_factory=list)
    relationships: List[str] = field(default_factory=list)
    long_term_preferences: List[str] = field(default_factory=list)
    habits_and_routines: List[str] = field(default_factory=list)
    emotional_triggers: List[str] = field(default_factory=list)
    presenting_problem: str = ""
    coping_mechanisms: str = ""
    support_system: str = ""
    personality_traits: str = ""
    risk_level: str = "Low"
    historical_spoken_content: List[str] = field(default_factory=list)

    # Session & Emotional History
    total_sessions_count: int = 0
    last_session_time: Optional[str] = None
    recent_user_utterances: List[str] = field(default_factory=list)
    journal_highlights: List[str] = field(default_factory=list)

    # Engine Telemetry
    assembly_duration_ms: float = 0.0
    db_acquire_ms: float = 0.0
    query_total_ms: float = 0.0

    def to_formatted_context_block(self, max_tokens: int = 600, is_greeting: bool = False) -> str:
        """
        Formats the unified profile into a structured 3-tier markdown block for AI prompts.
        Guarantees token efficiency by deduplicating facts and capping line count.
        """
        sections = []

        # ── USER IDENTITY ───────────────────────────────────────────────────
        user_disp_name = self.preferred_name if self.preferred_name and self.preferred_name.lower() != "mythri" else "Friend"
        id_parts = [f"User's Name: {user_disp_name}", f"Language: {self.language}"]
        if self.conversation_style:
            id_parts.append(f"Style: {self.conversation_style}")
        sections.append(
            f"[USER IDENTITY]\n• " + " | ".join(str(x) for x in id_parts)
            + f"\n• (Note: The user is {user_disp_name}. You are Mythri, their AI companion. NEVER call the user Mythri.)"
        )

        # ── TIER 1: EPISODIC MEMORY (Current Session - Live) ────────────────
        episodic_items = []
        if self.current_session_emotion:
            episodic_items.append(f"Current Session Mood: {self.current_session_emotion}")
        if self.current_session_topics:
            episodic_items.append(f"Topics Discussed Today: {', '.join(str(t) for t in self.current_session_topics)}")
        if self.current_session_working_facts:
            episodic_items.append(f"Working Turn Notes: {'; '.join(str(f) for f in self.current_session_working_facts[:4])}")
        if self.current_session_goal:
            episodic_items.append(f"Session Focus: {self.current_session_goal}")

        if episodic_items:
            sections.append(f"[EPISODIC MEMORY (CURRENT SESSION - LIVE)]\n• " + "\n• ".join(episodic_items))

        # ── TIER 2: SHORT-TERM MEMORY (Recent Times / Past Sessions) ─────────
        st_items = []
        if self.recent_emotional_trend:
            st_items.append(f"Recent Emotional Baseline: {self.recent_emotional_trend}")
        if self.living_context_summary:
            st_items.append(f"Ongoing Context: {self.living_context_summary}")
        if self.active_goals:
            st_items.append(f"Active Themes: {', '.join(str(g) for g in self.active_goals[:3])}")
        if self.unresolved_topics:
            st_items.append(f"Unresolved from Recent Sessions: {', '.join(str(u) for u in self.unresolved_topics[:3])}")
        if self.recent_session_summaries:
            st_items.append("Recent Sessions History:\n  " + "\n  ".join(f"• {s}" for s in self.recent_session_summaries[:3]))

        if st_items:
            sections.append(f"[SHORT-TERM MEMORY (RECENT TIMES & SESSIONS)]\n• " + "\n• ".join(st_items))

        # ── TIER 3: LONG-TERM MEMORY (Core Profile & Deep Historical Spoken Content) ──
        lt_items = []
        if self.personal_facts:
            lt_items.append(f"Personal Facts: {'; '.join(str(x) for x in self.personal_facts[:6])}")
        if self.relationships:
            lt_items.append(f"Relationships: {'; '.join(str(x) for x in self.relationships[:5])}")
        if self.long_term_preferences:
            lt_items.append(f"Preferences: {'; '.join(str(x) for x in self.long_term_preferences[:4])}")
        if self.habits_and_routines:
            lt_items.append(f"Habits & Routines: {'; '.join(str(x) for x in self.habits_and_routines[:3])}")
        if self.emotional_triggers:
            lt_items.append(f"Known Triggers: {'; '.join(str(x) for x in self.emotional_triggers[:3])}")
        if self.presenting_problem:
            lt_items.append(f"Core Challenge: {self.presenting_problem}")
        if self.coping_mechanisms:
            lt_items.append(f"What Helps: {self.coping_mechanisms}")

        # Deep past user statements/stories retrieved via semantic search
        if self.historical_spoken_content:
            past_statements = "\n  ".join(f"• \"{stmt}\"" for stmt in self.historical_spoken_content[:3])
            lt_items.append(f"Past Content Spoken Long Back (Deep Memory Recall):\n  {past_statements}")

        if lt_items:
            sections.append(f"[LONG-TERM MEMORY (HISTORICAL CONTENT & CORE PROFILE)]\n• " + "\n• ".join(lt_items))

        full_block = "\n\n".join(sections)

        # Token truncation protection (~4 chars per token)
        max_chars = max_tokens * 4
        if len(full_block) > max_chars:
            full_block = full_block[:max_chars] + "\n[...Context truncated for token budget]"

        return full_block


class UnifiedCognitiveContextEngine:
    """
    Unified Context Aggregation Engine.
    Queries user database tables and working memory into a 3-Tier UnifiedCognitiveProfile:
    - Tier 1: Episodic (Current Session / Active Episode)
    - Tier 2: Short-Term (Recent Times / Past Sessions)
    - Tier 3: Long-Term (Deep Past Spoken Content & Core Facts)
    """

    def build_context(
        self,
        db: Session,
        user_id: int,
        session_id: Optional[int] = None,
        query: str = "",
    ) -> UnifiedCognitiveProfile:
        start_time = time.time()
        profile = UnifiedCognitiveProfile(user_id=user_id, current_session_id=session_id)

        try:
            from core.database.models import (
                LivingUserContext, CompanionMemory, User, UserOnboarding,
                UserProfile, SessionSummary, Session as DBSession, Message as DBMessage
            )
            from modules.memory.short_term import short_term_engine
            
            # ── 1. Fetch User Identity & Onboarding ─────────────────────────
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                profile.language = user.preferred_language or "en-IN"
                profile.preferred_name = user.username
            
            user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            if user_profile and user_profile.preferred_name:
                profile.preferred_name = user_profile.preferred_name
                
            onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
            if onboarding:
                if onboarding.preferred_name:
                    profile.preferred_name = onboarding.preferred_name
                if onboarding.language:
                    profile.language = onboarding.language
                if onboarding.conversation_style:
                    profile.conversation_style = onboarding.conversation_style
                if onboarding.communication_mode:
                    profile.communication_mode = onboarding.communication_mode
                if onboarding.summary:
                    profile.onboarding_summary = onboarding.summary

            # ── 2. TIER 1: Fetch Episodic Memory (Current Active Session) ───
            if session_id:
                st_session = short_term_engine.read_working_memory(session_id)
                if st_session:
                    profile.current_session_topics = list(st_session.active_topics)
                    profile.current_session_emotion = st_session.current_emotion
                    profile.current_session_working_facts = [
                        item.content for item in st_session.active_items
                        if item.user_id == user_id and not item.is_expired
                    ]
                
                # Check current session record for goal / emotion
                cur_sess_db = db.query(DBSession).filter(DBSession.id == session_id).first()
                if cur_sess_db:
                    if cur_sess_db.conversation_goal:
                        profile.current_session_goal = cur_sess_db.conversation_goal
                    if not profile.current_session_emotion and cur_sess_db.dominant_emotion:
                        profile.current_session_emotion = cur_sess_db.dominant_emotion

            # ── 3. TIER 2: Fetch Short-Term Memory (Recent Times / Past Sessions) ─
            # Load up to 3 most recent session summaries (excluding current session)
            summary_query = db.query(SessionSummary).filter(SessionSummary.user_id == user_id)
            if session_id:
                summary_query = summary_query.filter(SessionSummary.session_id != session_id)
            
            past_summaries = summary_query.order_by(SessionSummary.created_at.desc()).limit(3).all()
            for s in past_summaries:
                topics_str = ", ".join(str(x) for x in s.main_topics) if s.main_topics else "General conversation"
                notes_str = s.important_context or ""
                unres_str = f" | Follow-up: {', '.join(str(x) for x in s.unresolved_topics)}" if s.unresolved_topics else ""
                created_str = s.created_at.strftime("%b %d") if s.created_at else "Earlier session"
                summary_formatted = f"[{created_str}]: Topics: {topics_str}. Notes: {notes_str}{unres_str}".strip()
                profile.recent_session_summaries.append(summary_formatted)

            living_ctx = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
            if living_ctx:
                if living_ctx.compact_summary:
                    profile.living_context_summary = living_ctx.compact_summary
                if living_ctx.active_themes:
                    profile.active_goals.extend(living_ctx.active_themes)
                if living_ctx.unresolved_topics:
                    profile.unresolved_topics.extend(living_ctx.unresolved_topics)
                if living_ctx.emotional_baseline:
                    profile.recent_emotional_trend = living_ctx.emotional_baseline

            # ── 4. TIER 3: Fetch Long-Term Memory (Facts, Traits & Deep History) ─
            recent_mems = db.query(CompanionMemory).filter(
                CompanionMemory.user_id == user_id
            ).order_by(CompanionMemory.created_at.desc()).limit(50).all()

            top_importance_mems = db.query(CompanionMemory).filter(
                CompanionMemory.user_id == user_id
            ).order_by(CompanionMemory.importance_score.desc(), CompanionMemory.created_at.desc()).limit(50).all()
            
            seen_facts: Set[str] = set()
            for m in recent_mems + top_importance_mems:
                content_clean = m.content.strip()
                if not content_clean:
                    continue
                norm_content = content_clean.lower()
                if norm_content in seen_facts:
                    continue
                seen_facts.add(norm_content)

                mtype = (m.memory_type or "").lower()
                if "relationship" in mtype:
                    profile.relationships.append(content_clean)
                elif "preference" in mtype:
                    profile.long_term_preferences.append(content_clean)
                elif "goal" in mtype:
                    profile.active_goals.append(content_clean)
                elif "habit" in mtype:
                    profile.habits_and_routines.append(content_clean)
                elif "trigger" in mtype:
                    profile.emotional_triggers.append(content_clean)
                else:
                    profile.personal_facts.append(content_clean)

            # ── 5. Deep Past Content Search (Historical Statements Spoken Long Back) ─
            if query and len(query.strip()) > 3:
                import re
                clean_q = re.sub(r"[^\w\s]", " ", query.lower())
                query_words = [w for w in clean_q.split() if len(w) >= 4 and w not in {
                    "what", "when", "where", "which", "about", "there", "their", "remember", "think", "talked", "spoke"
                }]
                
                if query_words:
                    # Query user messages from older sessions
                    msg_query = db.query(DBMessage).filter(
                        DBMessage.role == "user"
                    )
                    if session_id:
                        # Find messages from other sessions belonging to this user
                        msg_query = msg_query.join(DBSession, DBMessage.session_id == DBSession.id).filter(
                            DBSession.user_id == user_id,
                            DBSession.id != session_id
                        )
                    else:
                        msg_query = msg_query.join(DBSession, DBMessage.session_id == DBSession.id).filter(
                            DBSession.user_id == user_id
                        )

                    past_user_msgs = msg_query.order_by(DBMessage.created_at.desc()).limit(60).all()
                    scored_past_msgs = []
                    for pm in past_user_msgs:
                        pm_content = pm.content.strip()
                        if len(pm_content) < 15:
                            continue
                        pm_lower = pm_content.lower()
                        match_count = sum(1 for w in query_words if w in pm_lower)
                        if match_count >= 1:
                            scored_past_msgs.append((match_count, pm_content))

                    scored_past_msgs.sort(key=lambda x: x[0], reverse=True)
                    for _, content in scored_past_msgs[:3]:
                        if content not in profile.historical_spoken_content:
                            profile.historical_spoken_content.append(content)

        except Exception as e:
            print(f"[UnifiedCognitiveContextEngine] Error building 3-tier profile: {e}")

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
