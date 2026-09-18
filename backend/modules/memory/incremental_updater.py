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
    Background task to synthesize and update the Living User Context based on the
    WHOLE-DATABASE longitudinal user history.
    Uses MasterMemorySynthesizer and Optimistic Concurrency Control (OCC).
    """
    db = SessionLocal()
    try:
        from modules.memory.master_synthesizer import MasterMemorySynthesizer
        
        for attempt in range(max_retries):
            try:
                record = await MasterMemorySynthesizer.synthesize_user(user_id, db)
                if record:
                    logger.info(f"[LIVING_CONTEXT] Master memory synthesis completed for user {user_id} (Session {session_id}).")
                break
            except StaleDataError:
                logger.warning(f"[LIVING_CONTEXT] OCC collision for user {user_id}. Retrying {attempt+1}/{max_retries}...")
                db.rollback()
                await asyncio.sleep(0.5)
                continue
            except Exception as inner_e:
                logger.error(f"[LIVING_CONTEXT] Inner exception during master synthesis: {inner_e}")
                db.rollback()
                break

    except Exception as e:
        logger.error(f"[LIVING_CONTEXT] Error updating whole-DB living context: {e}")
    finally:
        db.close()
