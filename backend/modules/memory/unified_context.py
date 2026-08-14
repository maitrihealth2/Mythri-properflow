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
        sections.append(f"[USER IDENTITY & PREFERENCES]\n• " + " | ".join(id_parts))

        # 2. THERAPEUTIC GOALS & REASONS
        goal_items = []
        if self.primary_goal:
            goal_items.append(f"Primary Goal: {self.primary_goal}")
        if self.goals:
            goal_items.append(f"Goals: {', '.join(self.goals)}")
        if self.reasons_for_joining:
            goal_items.append(f"Motivations: {', '.join(self.reasons_for_joining)}")
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

        from sqlalchemy import text
        try:
            sql = text("""
                SELECT 
                  (SELECT preferred_language FROM users WHERE id = u.id) AS language,
                  (SELECT row_to_json(o) FROM user_onboarding o WHERE o.user_id = u.id) AS onboarding,
                  (SELECT row_to_json(p) FROM user_persona_profiles p WHERE p.user_id = u.id) AS persona,
                  (SELECT json_agg(m) FROM (SELECT * FROM companion_memories WHERE user_id = u.id ORDER BY importance_score DESC, created_at DESC LIMIT 5) m) AS memories,
                  (SELECT json_agg(n) FROM (SELECT n.* FROM consultation_notes n JOIN sessions s ON n.session_id = s.id WHERE s.user_id = u.id ORDER BY n.created_at DESC LIMIT 3) n) AS notes,
                  (SELECT count(id) FROM sessions WHERE user_id = u.id) AS sessions_count,
                  (SELECT json_agg(g) FROM (SELECT * FROM user_goals WHERE user_id = u.id AND status = 'in_progress') g) AS goals,
                  (SELECT json_agg(j) FROM (SELECT * FROM user_journals WHERE user_id = u.id ORDER BY created_at DESC LIMIT 2) j) AS journals,
                  (SELECT row_to_json(e) FROM (SELECT e.* FROM message_emotions e JOIN messages m ON e.message_id = m.id JOIN sessions s ON m.session_id = s.id WHERE s.user_id = u.id AND m.role = 'user' ORDER BY e.created_at DESC LIMIT 1) e) AS last_emotion
                FROM users u
                WHERE u.id = :user_id;
            """)
            
            result = db.execute(sql, {"user_id": user_id}).mappings().first()
            if result:
                profile.language = result["language"] or "en-IN"
                
                onboarding = result["onboarding"]
                if onboarding:
                    if onboarding.get("preferred_name"): profile.preferred_name = onboarding.get("preferred_name")
                    if onboarding.get("language"): profile.language = onboarding.get("language")
                    if onboarding.get("conversation_style"): profile.conversation_style = onboarding.get("conversation_style")
                    if onboarding.get("communication_mode"): profile.communication_mode = onboarding.get("communication_mode")
                    if onboarding.get("primary_goal"): profile.primary_goal = onboarding.get("primary_goal")
                    if onboarding.get("goals") and isinstance(onboarding.get("goals"), list): profile.goals = onboarding.get("goals")
                    if onboarding.get("reasons") and isinstance(onboarding.get("reasons"), list): profile.reasons_for_joining = onboarding.get("reasons")
                
                persona = result["persona"]
                if persona:
                    if persona.get("initial_presenting_topic"): profile.presenting_problem = persona.get("initial_presenting_topic")
                    elif persona.get("initial_presenting_problem"): profile.presenting_problem = persona.get("initial_presenting_problem")
                    if persona.get("coping_mechanisms"): profile.coping_mechanisms = str(persona.get("coping_mechanisms"))
                    if persona.get("perceived_support_system"): profile.support_system = str(persona.get("perceived_support_system"))
                    if persona.get("personality_traits"): profile.personality_traits = str(persona.get("personality_traits"))
                    if persona.get("risk_level"): profile.risk_level = persona.get("risk_level")
                    
                memories = result["memories"] or []
                seen_facts: Set[str] = set()
                for m in memories:
                    content_clean = m.get("content", "").strip()
                    if not content_clean: continue
                    norm_content = content_clean.lower()
                    if norm_content in seen_facts: continue
                    seen_facts.add(norm_content)
                    
                    mtype = (m.get("memory_type") or "").lower()
                    if "relationship" in mtype: profile.relationships.append(content_clean)
                    elif "preference" in mtype: profile.long_term_preferences.append(content_clean)
                    elif "goal" in mtype: profile.active_goals.append(content_clean)
                    elif "habit" in mtype: profile.habits_and_routines.append(content_clean)
                    elif "trigger" in mtype: profile.emotional_triggers.append(content_clean)
                    else: profile.personal_facts.append(content_clean)
                    
                notes = result["notes"] or []
                for n in notes:
                    if n.get("summary"):
                        profile.recent_session_summaries.append(n.get("summary")[:200])
                        
                profile.total_sessions_count = result["sessions_count"] or 0
                
                last_emotion = result["last_emotion"]
                if last_emotion and last_emotion.get("emotion_label"):
                    profile.recent_emotional_trend = last_emotion.get("emotion_label").capitalize()
                    
                goals = result["goals"] or []
                for ug in goals:
                    if ug.get("title") and ug.get("title") not in profile.goals:
                        profile.goals.append(ug.get("title"))
                        
                journals = result["journals"] or []
                for j in journals:
                    j_title = j.get("title") or (j.get("content", "")[:50])
                    profile.journal_highlights.append(f"{j_title} (Mood: {j.get('mood') or 'Neutral'})")
                    
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
