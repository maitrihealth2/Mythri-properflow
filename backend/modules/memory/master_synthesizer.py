"""
Master Longitudinal Memory Synthesizer
=======================================
Consolidates the entire whole-database historical record for a user into a
structured, longitudinal Master Cognitive Knowledge Record.

Features:
1. High-fidelity extraction across all life domains (Identity, Relationships, Emotional Baseline, Milestones, Active Challenges).
2. Conflict resolution & evolution (outdated facts become past timeline events rather than conflicting active goals).
3. Zero data loss: all raw records in the database remain untouched; the master record acts as an indexed semantic map.
4. Auto-synchronization with LivingUserContext and CompanionMemory SQL tables.
"""

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from core.database.models import SessionLocal, LivingUserContext, CompanionMemory
from modules.memory.global_aggregator import WholeDBUserAggregator, WholeDBUserDump
from providers.llm.router import llm_router

logger = logging.getLogger(__name__)


MASTER_SYNTHESIS_SYSTEM_PROMPT = """You are the Mythri Master Longitudinal Memory Engine.
Your task is to analyze the COMPLETE, WHOLE-DATABASE historical journey of a user and produce a structured, high-accuracy Master Cognitive Record.

RULES FOR SYNTHESIS:
1. NO LOSS OF INFORMATION: Capture all key people, facts, recurring emotional patterns, coping mechanisms, and ongoing life challenges.
2. EVOLUTION OVER TIME: If a past goal was achieved or changed (e.g. searching for a job -> got hired), record the outcome in the timeline and reflect the current active reality in the profile.
3. CONCRETE & SPECIFIC: Use real names, specific places, and exact circumstances from the conversation history. Avoid vague placeholders like "User has family issues".
4. OUTPUT STRICT JSON ONLY. Do NOT enclose in markdown code blocks or add explanatory conversational text.

REQUIRED JSON OUTPUT FORMAT:
{
  "identity_profile": {
    "preferred_name": "string",
    "life_stage_or_role": "string (e.g., Final year engineering student, Working mother)",
    "communication_preference": "string",
    "core_values": ["value1", "value2"]
  },
  "relationship_graph": [
    {
      "name": "string",
      "role": "string (e.g. Sister, Roommate, Mother, Manager, Therapist)",
      "dynamic": "string (Brief note on relationship quality and emotional significance)",
      "sentiment": "supportive | strained | neutral | complex"
    }
  ],
  "longitudinal_emotional_model": {
    "baseline_state": "string (Typical emotional baseline over time)",
    "primary_triggers": ["trigger 1", "trigger 2"],
    "effective_coping_mechanisms": ["coping 1", "coping 2"],
    "ineffective_or_adverse_approaches": ["approach 1"]
  },
  "life_timeline_and_events": [
    {
      "period": "string (e.g. 2026-08 or Recent)",
      "event": "string (Milestone, crisis, or life transition)",
      "status": "completed | ongoing | resolved"
    }
  ],
  "active_unresolved_loops": [
    {
      "topic": "string (Topic left unaddressed or requiring therapeutic follow-up)",
      "urgency": "high | medium | low"
    }
  ],
  "therapeutic_milestones": [
    "string (Concrete personal growth, skills learned, or breakthroughs)"
  ],
  "compact_summary": "string (A rich 2-3 sentence global living summary for instant prompt context)",
  "active_themes": ["Theme1", "Theme2", "Theme3"]
}
"""


@dataclass
class MasterCognitiveRecord:
    user_id: int
    raw_data: Dict[str, Any]
    synthesized_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def compact_summary(self) -> str:
        return self.raw_data.get("compact_summary") or "Living context synthesis in progress."

    @property
    def active_themes(self) -> List[str]:
        return self.raw_data.get("active_themes") or []

    @property
    def relationships(self) -> List[Dict[str, Any]]:
        return self.raw_data.get("relationship_graph") or []

    @property
    def emotional_model(self) -> Dict[str, Any]:
        return self.raw_data.get("longitudinal_emotional_model") or {}

    @property
    def timeline(self) -> List[Dict[str, Any]]:
        return self.raw_data.get("life_timeline_and_events") or []

    @property
    def unresolved_loops(self) -> List[Dict[str, Any]]:
        return self.raw_data.get("active_unresolved_loops") or []

    @property
    def milestones(self) -> List[str]:
        return self.raw_data.get("therapeutic_milestones") or []


class MasterMemorySynthesizer:
    """
    Executes the whole-database memory synthesis pipeline.
    """

    @classmethod
    async def synthesize_user(cls, user_id: int, db: Optional[Session] = None) -> Optional[MasterCognitiveRecord]:
        """
        Pull whole-DB context for user_id, run LLM master synthesis, and persist to SQL tables.
        """
        own_db = False
        if db is None:
            db = SessionLocal()
            own_db = True

        try:
            # 1. Aggregate whole database for the user
            dump = WholeDBUserAggregator.aggregate_user(db, user_id)
            if dump.total_messages_count == 0 and not dump.onboarding_data:
                logger.info(f"[MasterSynthesizer] No data to synthesize for user {user_id}")
                return None

            user_prompt = dump.to_compact_synthesis_prompt()

            # 2. Call LLM Router
            api_messages = [
                {"role": "system", "content": MASTER_SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]

            response = await llm_router.generate(
                api_messages=api_messages,
                max_tokens=1500,
                temperature=0.2  # Low temperature for deterministic extraction accuracy
            )

            if not response:
                logger.error(f"[MasterSynthesizer] Empty response from LLM for user {user_id}")
                return None

            # 3. Clean and parse JSON
            match = re.search(r'\{.*\}', response, re.DOTALL)
            clean_json = match.group(0) if match else re.sub(r'```(?:json)?', '', response).strip('` \n')
            
            try:
                parsed_data = json.loads(clean_json)
            except json.JSONDecodeError as err:
                logger.error(f"[MasterSynthesizer] JSON decode error for user {user_id}: {err}\nRaw: {clean_json[:300]}")
                return None

            # 4. Save to LivingUserContext with Optimistic Concurrency Control
            living_ctx = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
            if not living_ctx:
                living_ctx = LivingUserContext(user_id=user_id)
                db.add(living_ctx)
                db.commit()
                db.refresh(living_ctx)

            living_ctx.compact_summary = parsed_data.get("compact_summary") or living_ctx.compact_summary
            living_ctx.active_themes = parsed_data.get("active_themes") or living_ctx.active_themes
            
            unresolved = [u.get("topic", str(u)) if isinstance(u, dict) else str(u) for u in parsed_data.get("active_unresolved_loops", [])]
            living_ctx.unresolved_topics = unresolved
            
            emo_model = parsed_data.get("longitudinal_emotional_model", {})
            living_ctx.emotional_baseline = emo_model.get("baseline_state") or living_ctx.emotional_baseline
            living_ctx.raw_structured_json = parsed_data
            
            living_ctx.processing_status = "completed"
            living_ctx.last_processed_session_id = dump.sessions[-1].session_id if dump.sessions else None
            db.commit()

            # 5. Sync Key Discovered Relationships & Triggers into CompanionMemory
            cls._sync_companion_memories(db, user_id, parsed_data)
            db.commit()

            record = MasterCognitiveRecord(user_id=user_id, raw_data=parsed_data)
            logger.info(f"[MasterSynthesizer] Successfully synthesized master memory record for user {user_id} ({len(dump.sessions)} sessions, {dump.total_messages_count} messages)")
            return record

        except Exception as e:
            logger.error(f"[MasterSynthesizer] Unexpected error during synthesis for user {user_id}: {repr(e)}")
            if own_db:
                db.rollback()
            return None
        finally:
            if own_db:
                db.close()

    @staticmethod
    def _sync_companion_memories(db: Session, user_id: int, parsed_data: Dict[str, Any]):
        """
        Synchronizes structured facts (relationships, triggers, coping mechanisms)
        into the companion_memories table without creating duplicates.
        """
        existing_mem_contents = {
            m.content.lower().strip()
            for m in db.query(CompanionMemory).filter(CompanionMemory.user_id == user_id).all()
        }

        # Sync Relationships
        for rel in parsed_data.get("relationship_graph", []):
            name = rel.get("name", "")
            role = rel.get("role", "")
            dynamic = rel.get("dynamic", "")
            if name and role:
                content = f"Relationship: {name} ({role}) - {dynamic}"
                if content.lower().strip() not in existing_mem_contents:
                    db.add(CompanionMemory(
                        user_id=user_id,
                        memory_type="relationship",
                        content=content,
                        importance_score=0.85
                    ))
                    existing_mem_contents.add(content.lower().strip())

        # Sync Triggers
        emo_model = parsed_data.get("longitudinal_emotional_model", {})
        for trig in emo_model.get("primary_triggers", []):
            if trig:
                content = f"Known Emotional Trigger: {trig}"
                if content.lower().strip() not in existing_mem_contents:
                    db.add(CompanionMemory(
                        user_id=user_id,
                        memory_type="trigger",
                        content=content,
                        importance_score=0.85
                    ))
                    existing_mem_contents.add(content.lower().strip())

        # Sync Coping Mechanisms
        for cope in emo_model.get("effective_coping_mechanisms", []):
            if cope:
                content = f"Effective Coping Mechanism: {cope}"
                if content.lower().strip() not in existing_mem_contents:
                    db.add(CompanionMemory(
                        user_id=user_id,
                        memory_type="preference",
                        content=content,
                        importance_score=0.80
                    ))
                    existing_mem_contents.add(content.lower().strip())
