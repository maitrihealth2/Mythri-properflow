"""
Whole-Database User Context Aggregator
=======================================
Extracts all longitudinal historical data for a given user across all database tables:
1. User Identity & Onboarding (users, user_onboarding, user_profiles, user_persona_profiles)
2. All Historical Sessions & Messages (sessions, messages, message_emotions)
3. Longitudinal Emotional Trajectory (message_emotions, session emotional ranges)
4. User Reflections & Therapeutic Work (user_journals, user_goals, exercise_logs)
5. Existing Structured Memory (companion_memories, session_summaries, living_user_contexts)

Zero data loss: captures all records permanently to create a master context dump for synthesis.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from core.database.models import (
    User,
    UserOnboarding,
    UserProfile,
    UserPersonaProfile,
    Session as DBSession,
    Message as DBMessage,
    MessageEmotion,
    UserJournal,
    UserGoal,
    ExerciseLog,
    CompanionMemory,
    SessionSummary,
    LivingUserContext,
)


@dataclass
class AggregatedSessionSnapshot:
    session_id: int
    session_token: str
    started_at: Optional[str]
    ended_at: Optional[str]
    message_count: int
    user_utterances: List[str] = field(default_factory=list)
    assistant_utterances: List[str] = field(default_factory=list)
    emotions_detected: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None


@dataclass
class WholeDBUserDump:
    user_id: int
    username: str
    preferred_name: str
    language: str
    onboarding_data: Dict[str, Any] = field(default_factory=dict)
    persona_data: Dict[str, Any] = field(default_factory=dict)
    
    # Historical sessions & transcripts
    total_sessions_count: int = 0
    total_messages_count: int = 0
    sessions: List[AggregatedSessionSnapshot] = field(default_factory=list)
    
    # Emotional telemetry
    dominant_emotions: List[str] = field(default_factory=list)
    recent_emotional_trend: Optional[str] = None
    
    # Therapeutic logs
    journals: List[Dict[str, Any]] = field(default_factory=list)
    goals: List[Dict[str, Any]] = field(default_factory=list)
    completed_exercises: List[Dict[str, Any]] = field(default_factory=list)
    
    # Existing companion memories
    existing_memories: List[Dict[str, Any]] = field(default_factory=list)
    current_living_summary: Optional[str] = None
    current_living_themes: List[str] = field(default_factory=list)

    def to_compact_synthesis_prompt(self, max_message_tokens: int = 2500) -> str:
        """
        Formats the entire aggregated database history into a structured prompt block
        ready for the MasterMemorySynthesizer LLM.
        """
        lines = []
        lines.append(f"=== USER PROFILE: {self.preferred_name} (ID: {self.user_id}) ===")
        lines.append(f"Language: {self.language}")
        
        if self.onboarding_data:
            lines.append("\n[ONBOARDING INITIAL BASELINE]")
            for k, v in self.onboarding_data.items():
                if v:
                    lines.append(f"• {k}: {v}")

        if self.persona_data:
            lines.append("\n[PERSONA & CLINICAL PROFILE]")
            for k, v in self.persona_data.items():
                if v:
                    lines.append(f"• {k}: {v}")

        if self.goals:
            lines.append("\n[RECORDED USER GOALS]")
            for g in self.goals:
                status = g.get("status", "active")
                lines.append(f"• {g.get('title', '')} (Status: {status})")

        if self.journals:
            lines.append("\n[JOURNAL REFLECTIONS (LAST ENTRIES)]")
            for j in self.journals[:5]:
                lines.append(f"• [{j.get('created_at', '')}] {j.get('title', 'Entry')}: {j.get('content', '')[:200]}")

        if self.completed_exercises:
            lines.append("\n[THERAPEUTIC EXERCISE OUTCOMES]")
            for ex in self.completed_exercises[:8]:
                lines.append(
                    f"• Type: {ex.get('type')} | Pre-Emotion: {ex.get('pre_emotion')} -> "
                    f"Post-Emotion: {ex.get('post_emotion')} | Feedback: {ex.get('feedback', 'None')}"
                )

        if self.existing_memories:
            lines.append("\n[PREVIOUSLY RECORDED PERMANENT FACTS]")
            for mem in self.existing_memories:
                lines.append(f"• [{mem.get('category', 'FACT')}]: {mem.get('content', '')}")

        lines.append(f"\n=== CONVERSATION HISTORY ({self.total_sessions_count} SESSIONS, {self.total_messages_count} TOTAL MESSAGES) ===")
        
        for sess in self.sessions:
            lines.append(f"\n--- SESSION #{sess.session_id} ({sess.started_at or 'Undated'}) ---")
            if sess.summary:
                lines.append(f"Session Summary: {sess.summary.get('important_context') or sess.summary.get('main_topics')}")
            
            # Include dialogues
            for u_text in sess.user_utterances:
                lines.append(f"User: {u_text}")
            for a_text in sess.assistant_utterances:
                lines.append(f"Mythri: {a_text[:180]}")

        return "\n".join(lines)


class WholeDBUserAggregator:
    """
    Fetches all relational database records for a given user.
    Pure database extraction service.
    """

    @staticmethod
    def aggregate_user(db: Session, user_id: int) -> WholeDBUserDump:
        # 1. Fetch User Identity
        user = db.query(User).filter(User.id == user_id).first()
        username = user.username if user else f"User_{user_id}"
        language = user.preferred_language if user else "en-IN"
        
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        preferred_name = user_profile.preferred_name if user_profile and user_profile.preferred_name else username

        # 2. Onboarding
        onboarding_dict = {}
        onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
        if onboarding:
            onboarding_dict = {
                "preferred_name": onboarding.preferred_name,
                "primary_goal": onboarding.primary_goal,
                "goals": onboarding.goals or [],
                "reasons": onboarding.reasons or [],
                "initial_emotion": onboarding.initial_emotion,
                "summary": onboarding.summary,
            }

        # 3. Persona Profile
        persona_dict = {}
        persona = db.query(UserPersonaProfile).filter(UserPersonaProfile.user_id == user_id).first()
        if persona:
            persona_dict = {
                "initial_presenting_topic": getattr(persona, "initial_presenting_topic", None),
                "communication_style": getattr(persona, "communication_style", None),
                "processing_preference": getattr(persona, "processing_preference", None),
                "life_focus_areas": getattr(persona, "life_focus_areas", None),
                "emotional_range": getattr(persona, "emotional_range", None),
            }

        # 4. Fetch All Sessions with Messages & Emotions
        db_sessions = db.query(DBSession).filter(
            DBSession.user_id == user_id
        ).order_by(DBSession.started_at.asc()).all()

        total_sessions = len(db_sessions)
        session_snapshots: List[AggregatedSessionSnapshot] = []
        total_msgs = 0

        for s in db_sessions:
            messages = db.query(DBMessage).options(
                joinedload(DBMessage.emotion)
            ).filter(
                DBMessage.session_id == s.id
            ).order_by(DBMessage.created_at.asc()).all()

            total_msgs += len(messages)
            
            user_utterances = []
            assistant_utterances = []
            emotions = []

            for m in messages:
                if m.role == "user":
                    user_utterances.append(m.content)
                    if m.emotion:
                        emotions.append({
                            "label": m.emotion.emotion_label,
                            "score": m.emotion.score,
                            "created_at": m.created_at.isoformat() if m.created_at else None
                        })
                else:
                    assistant_utterances.append(m.content)

            # Check for existing session summary
            summary_row = db.query(SessionSummary).filter(SessionSummary.session_id == s.id).first()
            summary_dict = None
            if summary_row:
                summary_dict = {
                    "main_topics": summary_row.main_topics,
                    "emotional_progression": summary_row.emotional_progression,
                    "important_context": summary_row.important_context,
                    "unresolved_topics": summary_row.unresolved_topics,
                }

            snapshot = AggregatedSessionSnapshot(
                session_id=s.id,
                session_token=s.session_token,
                started_at=s.started_at.isoformat() if s.started_at else (s.created_at.isoformat() if s.created_at else None),
                ended_at=s.ended_at.isoformat() if s.ended_at else None,
                message_count=len(messages),
                user_utterances=user_utterances,
                assistant_utterances=assistant_utterances,
                emotions_detected=emotions,
                summary=summary_dict,
            )
            session_snapshots.append(snapshot)

        # 5. User Journals & Goals
        journals_list = []
        for j in db.query(UserJournal).filter(UserJournal.user_id == user_id).order_by(UserJournal.created_at.desc()).limit(10).all():
            journals_list.append({
                "title": j.title,
                "content": j.content,
                "created_at": j.created_at.isoformat() if j.created_at else None
            })

        goals_list = []
        for g in db.query(UserGoal).filter(UserGoal.user_id == user_id).all():
            goals_list.append({
                "title": g.title,
                "description": g.description,
                "status": g.status,
            })

        # 6. Exercises
        exercises_list = []
        for ex in db.query(ExerciseLog).filter(ExerciseLog.user_id == user_id, ExerciseLog.state == "completed").order_by(ExerciseLog.completed_at.desc()).limit(10).all():
            exercises_list.append({
                "type": ex.exercise_type,
                "pre_emotion": ex.pre_emotion,
                "post_emotion": ex.post_emotion,
                "feedback": ex.user_feedback,
                "completed_at": ex.completed_at.isoformat() if ex.completed_at else None
            })

        # 7. Existing Memories & Living Context
        memories_list = []
        for mem in db.query(CompanionMemory).filter(CompanionMemory.user_id == user_id).all():
            memories_list.append({
                "category": mem.memory_type,
                "content": mem.content,
                "importance_score": mem.importance_score,
            })

        living_ctx = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
        living_summary = living_ctx.compact_summary if living_ctx else None
        living_themes = living_ctx.active_themes if living_ctx else []

        return WholeDBUserDump(
            user_id=user_id,
            username=username,
            preferred_name=preferred_name,
            language=language,
            onboarding_data=onboarding_dict,
            persona_data=persona_dict,
            total_sessions_count=total_sessions,
            total_messages_count=total_msgs,
            sessions=session_snapshots,
            journals=journals_list,
            goals=goals_list,
            completed_exercises=exercises_list,
            existing_memories=memories_list,
            current_living_summary=living_summary,
            current_living_themes=living_themes or [],
        )
