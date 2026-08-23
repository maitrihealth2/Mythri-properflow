import asyncio
import json
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from core.database.models import SessionLocal, LivingUserContext, Message as DBMessage, Session as DBSession
from providers.llm.router import llm_router

logger = logging.getLogger(__name__)

async def update_living_context(user_id: int, session_id: int, max_retries: int = 3):
    """
    Background task to incrementally update the Living User Context based on the recent session.
    Uses Optimistic Concurrency Control (OCC) to prevent race conditions.
    """
    db = SessionLocal()
    try:
        # 1. Fetch recent session messages
        messages = db.query(DBMessage).filter(
            DBMessage.session_id == session_id
        ).order_by(DBMessage.created_at).all()

        if not messages or len(messages) < 2:
            logger.info(f"[LIVING_CONTEXT] Session {session_id} too short for update.")
            return

        convo_lines = []
        for m in messages[-20:]:  # Use last 20 messages for recent context evolution
            role_label = "USER" if m.role == "user" else "MYTHRI"
            convo_lines.append(f"{role_label}: {m.content[:300]}")
        conversation_text = "\n".join(convo_lines)

        for attempt in range(max_retries):
            try:
                # 2. Fetch or create the LivingUserContext
                living_context = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
                if not living_context:
                    living_context = LivingUserContext(user_id=user_id)
                    db.add(living_context)
                    db.commit()
                    db.refresh(living_context)

                # Set to updating status
                living_context.processing_status = "updating"
                db.commit()
                db.refresh(living_context)
                
                old_summary = living_context.compact_summary or "No previous summary exists."
                old_themes = ", ".join(living_context.active_themes) if living_context.active_themes else "None"

                # 3. Prompt LLM to incrementally update
                system_prompt = (
                    "You are the Mythri memory synthesis engine.\n"
                    "Your task is to update the user's living context based on a new conversation.\n"
                    "RULES:\n"
                    "1. Merge the old context with new facts/outcomes.\n"
                    "2. Consolidate redundant information. If something was resolved, summarize it compactly.\n"
                    "3. Do not just append transcripts; extract the meaning.\n"
                    "4. Output STRICT JSON with exactly this format:\n"
                    "{\n"
                    '  "compact_summary": "A concise paragraph summarizing the living context.",\n'
                    '  "active_themes": ["Theme1", "Theme2"],\n'
                    '  "unresolved_topics": ["Topic1", "Topic2"],\n'
                    '  "emotional_baseline": "A few words on emotional state"\n'
                    "}\n"
                    "Do not include markdown blocks or any other text."
                )

                user_prompt = (
                    f"--- OLD CONTEXT ---\n"
                    f"Summary: {old_summary}\n"
                    f"Active Themes: {old_themes}\n\n"
                    f"--- NEW CONVERSATION (Session {session_id}) ---\n"
                    f"{conversation_text}\n"
                )

                # Run LLM
                api_messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                response = await llm_router.generate(api_messages=api_messages, max_tokens=1024, temperature=0.5)

                if not response:
                    logger.error(f"[LIVING_CONTEXT] Empty response from LLM for user {user_id}")
                    living_context.processing_status = "error_llm"
                    db.commit()
                    return

                # Clean output
                import re
                clean_json = re.sub(r'```(?:json)?', '', response).strip('` \n')
                
                try:
                    data = json.loads(clean_json)
                except json.JSONDecodeError:
                    logger.error(f"[LIVING_CONTEXT] Failed to parse LLM JSON: {clean_json}")
                    # Revert status on parse fail
                    living_context.processing_status = "error_parsing"
                    db.commit()
                    return

                # 4. Update the LivingUserContext
                living_context.compact_summary = data.get("compact_summary", living_context.compact_summary)
                living_context.active_themes = data.get("active_themes", living_context.active_themes)
                living_context.unresolved_topics = data.get("unresolved_topics", living_context.unresolved_topics)
                living_context.emotional_baseline = data.get("emotional_baseline", living_context.emotional_baseline)
                living_context.last_processed_session_id = session_id
                living_context.processing_status = "ready"
                
                # 5. Commit with Optimistic Concurrency Control
                db.commit()
                logger.info(f"[LIVING_CONTEXT] Successfully updated context for user {user_id}. Version is now {living_context.version}.")
                break # Success! Break out of retry loop

            except StaleDataError:
                logger.warning(f"[LIVING_CONTEXT] Concurrency collision for user {user_id}. Retrying {attempt+1}/{max_retries}...")
                db.rollback() # Rollback and try again
                continue
            except Exception as inner_e:
                logger.error(f"[LIVING_CONTEXT] Inner exception during update: {inner_e}")
                db.rollback()
                break

    except Exception as e:
        logger.error(f"[LIVING_CONTEXT] Error updating living context: {e}")
    finally:
        db.close()
