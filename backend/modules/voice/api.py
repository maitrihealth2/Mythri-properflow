"""
Voice API — Phase 3 Multi-language
Full pipeline: audio → STT → crisis → emotion → RAG → LLM → TTS → audio
"""

import base64
import traceback
import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database.models import get_db, Session as DBSession, Message, MessageEmotion, RiskLog, User
from providers.sarvam.voice_client import synthesize_speech, get_language_prompt, get_supported_languages
from modules.voice.stt_batcher import batch_transcribe_audio
from rag.brain.emotion_detector import detect_emotion, detect_emotion_heuristic
from rag.brain.analyst import should_skip_assessor, assess_turn
from modules.voice.vocal_engine import optimize_pitch
from security.crisis_handler import check_for_crisis
from rag.brain.state_tracker import tracker
from security.authentication.api import get_current_user
from modules.dashboard.api import broadcast_event

try:
    from rag.knowledge.retriever import retrieve_context, is_knowledge_base_ready
    RAG_AVAILABLE = is_knowledge_base_ready()
except Exception:
    RAG_AVAILABLE = False
    def retrieve_context(q, n=3): return ""

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.get("/languages")
def list_languages():
    return get_supported_languages()


class SpeakRequest(BaseModel):
    text: str
    language: str = "en-IN"


@router.post("/speak")
async def speak(
    req: SpeakRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        audio_bytes = await synthesize_speech(req.text, req.language)
        # Apply Vocal Prosody Optimization
        audio_bytes = await asyncio.to_thread(optimize_pitch, audio_bytes, "Neutral")
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        print(f"[VOICE] Speak failed: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="en-IN"),
    current_user: User = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    print(f"[TRANSCRIBE] size={len(audio_bytes)} lang={language}")
    if len(audio_bytes) < 500:
        return {"transcript": "", "language": language}
    try:
        transcript = await batch_transcribe_audio(audio_bytes, language)
        return {"transcript": transcript, "language": language}
    except Exception as e:
        print(f"[VOICE] Transcribe failed: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def handle_voice_turn(
    transcript: str,
    session_id: str,
    language: str,
    current_user: User,
    db: Session,
    background_tasks: BackgroundTasks = None,
):
    """
    Process a single voice turn — IDENTICAL cognitive pipeline to text consultation:
    Crisis -> Emotion -> RAG -> Unified Context -> CRSE -> Assessor -> Sarvam -> TTS.
    Returns the full response dictionary.
    """
    # ── Validate session ──────────────────────────────────────────────────────
    session = db.query(DBSession).filter(
        DBSession.session_token == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        print(f"[VOICE] ERROR: Session not found")
        raise HTTPException(status_code=404, detail="Session not found")
    print(f"[VOICE] Session DB id={session.id} OK")

    # Filter known STT hallucinations when there's background noise
    known_hallucinations = [
        "thank you.", "thank you", "subscribe", "subscribe.", 
        "subscribe to the channel", "subtitles by amara.org", 
        "[silence]", "you", "thanks."
    ]
    cleaned_transcript = transcript.strip().lower()
    if not cleaned_transcript or cleaned_transcript in known_hallucinations or len(cleaned_transcript) < 2:
        print(f"[VOICE] Empty or hallucinated transcript: '{transcript}' — treating as silence")
        async def silence_stream():
            import json
            yield json.dumps({"type": "transcript", "text": ""}) + "\n"
            yield json.dumps({"type": "metadata", "emotion": "Neutral", "emotion_emoji": "😐"}) + "\n"
            yield json.dumps({"type": "text", "text": ""}) + "\n"
        return StreamingResponse(silence_stream(), media_type="application/x-ndjson")
        
    await broadcast_event("STT_DONE", f"Transcribed text", {"text": transcript})

    # ── Delegate to Existing Consultation Pipeline ────────────────────────────
    print(f"[VOICE] Routing text through centralized consultation pipeline...")
    from modules.consultation.api import send_message, ChatRequest
    _bg = background_tasks if background_tasks is not None else BackgroundTasks()
    chat_req = ChatRequest(session_id=session_id, message=transcript, language=language)
    chat_resp = await send_message(req=chat_req, background_tasks=_bg, current_user=current_user, db=db)
    async def voice_stream_generator():
        import json
        import re
        
        # Yield transcript first so UI updates immediately
        yield json.dumps({"type": "transcript", "text": transcript}) + "\n"
        
        sentence_buffer = ""
        emotion_label = "Neutral"

        # Helper to synthesize and yield audio
        async def process_and_yield_audio(text_chunk):
            if not text_chunk.strip(): return
            try:
                audio = await synthesize_speech(text_chunk, language, emotion=emotion_label)
                # Skip pitch optimization for non-English to prevent "AI" robotic distortion
                if audio and language == "en-IN":
                    audio = await asyncio.to_thread(optimize_pitch, audio, emotion_label)
                
                if audio:
                    audio_b64 = base64.b64encode(audio).decode()
                    yield json.dumps({"type": "audio", "audio_b64": audio_b64, "text": text_chunk}) + "\n"
            except Exception as e:
                print(f"[VOICE] TTS chunk error: {e}")

        async for chunk in chat_resp.body_iterator:
            lines = chunk.decode("utf-8") if isinstance(chunk, bytes) else chunk
            for line in lines.split("\n"):
                line = line.strip()
                if not line: continue
                try:
                    data = json.loads(line)
                    if data.get("type") == "initial_metadata":
                        emotion_label = data.get("emotion", "Neutral")
                        
                        # Yield metadata to client immediately
                        yield json.dumps({
                            "type": "metadata",
                            "emotion": emotion_label,
                            "emotion_emoji": data.get("emotion_emoji", "😐"),
                            "is_crisis": data.get("is_crisis", False),
                            "helplines": data.get("helplines", []),
                            "rag_used": data.get("rag_used", False)
                        }) + "\n"
                        
                    elif data.get("type") == "chunk":
                        token = data.get("text", "")
                        sentence_buffer += token
                        # Send text token immediately
                        yield json.dumps({"type": "text", "text": token}) + "\n"
                        
                        # Check for sentence boundaries
                        if any(p in sentence_buffer for p in ['. ', '? ', '! ', '.\n', '?\n', '!\n']):
                            match = re.search(r'([.?!]+[\s\n]+)', sentence_buffer)
                            if match:
                                split_idx = match.end()
                                complete_sentence = sentence_buffer[:split_idx]
                                sentence_buffer = sentence_buffer[split_idx:]
                                
                                async for item in process_and_yield_audio(complete_sentence):
                                    yield item

                    elif data.get("type") == "metadata" and "full_text" in data:
                        # Process any remaining text in buffer at the end
                        if sentence_buffer.strip():
                            async for item in process_and_yield_audio(sentence_buffer):
                                yield item
                                
                except Exception as e:
                    pass

    return StreamingResponse(voice_stream_generator(), media_type="application/x-ndjson", background=_bg)


@router.post("/conversation")
async def voice_conversation(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    language: str = Form(default="en-IN"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print(f"\n{'='*60}")
    print(f"[VOICE] POST Request session={session_id} lang={language}")

    # ── Read audio ────────────────────────────────────────────────────────────
    audio_bytes = await audio.read()
    if len(audio_bytes) < 500:
        print("[VOICE] Audio too short or empty, treating as silence")
        return await handle_voice_turn("[Silence]", session_id, language, current_user, db)

    # ── STT ───────────────────────────────────────────────────────────────────
    try:
        await broadcast_event("ROUTING", "FastAPI -> Sarvam STT API")
        await broadcast_event("STT_START", "Transcribing (Batched)...")
        transcript = await batch_transcribe_audio(audio_bytes, language)
    except Exception as e:
        err_str = str(e)
        if "duration exceeds the maximum limit" in err_str:
            print("[VOICE] 30s limit hit. Gracefully prompting user.")
            msg = "I'm sorry, that was a bit too long for me to process at once. Could you repeat that in shorter pieces?"
            try:
                err_audio = await synthesize_speech(msg, language)
                if err_audio:
                    err_audio = await asyncio.to_thread(optimize_pitch, err_audio, "Neutral")
                    err_b64 = base64.b64encode(err_audio).decode()
            except Exception:
                err_b64 = ""
            async def err_stream():
                import json
                yield json.dumps({"type": "transcript", "text": "[Audio too long]"}) + "\n"
                yield json.dumps({"type": "text", "text": msg}) + "\n"
                if err_b64:
                    yield json.dumps({"type": "audio", "audio_b64": err_b64, "text": msg}) + "\n"
            return StreamingResponse(err_stream(), media_type="application/x-ndjson")
        print(f"[VOICE] STT failed: {type(e).__name__} - {err_str}")
        raise HTTPException(status_code=500, detail={"message": f"STT failed: {err_str}"})

    return await handle_voice_turn(transcript, session_id, language, current_user, db)


async def _process_voice_memory_write_async(user_id: int, user_message: str, session_id: int) -> None:
    """
    Voice Memory Write Worker — identical to text consultation memory write path.
    Executes asynchronously after the voice response is sent to client.
    Completely isolated so background errors never impact the live voice turn.
    """
    from core.database.models import SessionLocal
    from modules.memory import MemoryManager

    def _run_task():
        db = SessionLocal()
        try:
            from modules.memory import MemoryManager, short_term_engine, index_engine, WorkingMemoryKind

            # 1. Update Short-Term Working Memory
            short_term_engine.add_item(
                session_id=session_id,
                user_id=user_id,
                kind=WorkingMemoryKind.TURN_FACT,
                content=user_message[:300]
            )

            # 2. Execute Memory Write Pipeline
            manager = MemoryManager(db_session=db)
            result = manager.process_turn(
                user_id=user_id,
                user_message=user_message,
                session_id=session_id,
            )

            # 3. Synchronize Memory Index Engine
            for dec in result.decisions:
                if dec.is_actionable and dec.candidate:
                    index_engine.on_memory_created(dec.candidate)

            if result.has_actionable_decisions:
                print(f"[VOICE MEMORY] Extracted {len(result.candidates)} candidates, "
                      f"executed {len(result.decisions)} decisions for user {user_id}")
        except Exception as err:
            print(f"[VOICE MEMORY] Background write failed (non-fatal): {err}")
        finally:
            db.close()

    try:
        await asyncio.to_thread(_run_task)
    except Exception as exc:
        print(f"[VOICE MEMORY] Isolated task execution error (non-fatal): {exc}")
