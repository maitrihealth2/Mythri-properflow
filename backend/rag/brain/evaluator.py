import asyncio
from core.database.models import SessionLocal, ResponseMetadata

async def evaluate_response_async(message_id: int):
    """
    Simulates a background evaluation of Mythri's response quality.
    In production, this would call an LLM to evaluate the response against the user's message
    and generate improvement targets.
    """
    await asyncio.sleep(2) # Simulate LLM call
    db = SessionLocal()
    try:
        meta = db.query(ResponseMetadata).filter(ResponseMetadata.message_id == message_id).first()
        if meta:
            meta.quality_score = 0.85
            meta.improvement_targets = ["Increase validation slightly", "Shorten sentences"]
            db.commit()
    except Exception as e:
        print(f"Error in async evaluation: {e}")
    finally:
        db.close()
