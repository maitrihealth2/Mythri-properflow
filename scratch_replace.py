import os

file_path = r'd:\Copy\v3\Maitri New\backend\modules\voice\api.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find index of line with "# ── Crisis check"
start_idx = -1
for i, line in enumerate(lines):
    if "# ── Crisis check" in line:
        start_idx = i
        break

# find index of line with "return {" and the end of the return block
end_idx = -1
for i in range(start_idx, len(lines)):
    if "return {" in lines[i]:
        # find closing brace
        for j in range(i, len(lines)):
            if "}" in lines[j]:
                end_idx = j
                break
        break

if start_idx != -1 and end_idx != -1:
    new_block = """    # ── Delegate to Existing Consultation Pipeline ────────────────────────────
    print(f"[VOICE] Routing text through centralized consultation pipeline...")
    from modules.consultation.api import send_message, ChatRequest
    chat_req = ChatRequest(session_id=session_id, message=transcript, language=language)
    chat_resp = await send_message(req=chat_req, current_user=current_user, db=db)
    
    ai_response = chat_resp.response
    emotion_label = chat_resp.emotion

    # ── TTS ───────────────────────────────────────────────────────────────────
    print(f"[VOICE] Calling TTS...")
    audio_b64 = ""
    try:
        # Reuse user's emotion to determine voice tone instead of calling HF API again
        await broadcast_event("ROUTING", "LLM -> TTS API")
        await broadcast_event("TTS_START", "Synthesizing voice...")
        response_audio = await synthesize_speech(
            ai_response, 
            language, 
            emotion=emotion_label
        )
        # 6. Prosody & Pitch Optimization
        await broadcast_event("TTS_OPTIMIZE", "Optimizing vocal pitch and prosody...")
        response_audio = await asyncio.to_thread(optimize_pitch, response_audio, emotion_label)
        
        audio_b64 = base64.b64encode(response_audio).decode()
        await broadcast_event("TTS_DONE", "Audio ready")
        await broadcast_event("ROUTING", "FastAPI -> Client WebSocket Playback")
        print(f"[VOICE] TTS OK, audio size={len(response_audio)} bytes")
    except Exception as e:
        print(f"[VOICE] TTS failed: {type(e).__name__} - {e}")

    return {
        "transcript": transcript,
        "response": ai_response,
        "audio_b64": audio_b64,
        "is_crisis": chat_resp.is_crisis,
        "helplines": chat_resp.helplines,
        "emotion": chat_resp.emotion,
        "emotion_emoji": chat_resp.emotion_emoji,
        "emotion_score": chat_resp.emotion_score,
        "rag_used": chat_resp.rag_used,
    }
"""
    new_lines = lines[:start_idx] + [new_block] + lines[end_idx+1:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Replaced lines successfully.")
else:
    print(f"Indices not found: start_idx={start_idx}, end_idx={end_idx}")
