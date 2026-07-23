import io
import wave
import asyncio
import httpx
from typing import List

from ai_engine.voice_client import (
    convert_to_wav, 
    SUPPORTED_LANGUAGES, 
    SARVAM_API_KEY, 
    BASE_URL
)

def split_wav_into_batches(wav_bytes: bytes, chunk_duration_sec: int = 30, max_batches: int = 10) -> List[bytes]:
    """
    Splits a single WAV byte stream into multiple WAV byte streams,
    each corresponding to a chunk of maximum `chunk_duration_sec` seconds.
    Caps the total number of chunks to `max_batches`.
    """
    chunks = []
    try:
        with wave.open(io.BytesIO(wav_bytes), 'rb') as w:
            frames = w.getnframes()
            rate = w.getframerate()
            frames_per_chunk = rate * chunk_duration_sec
            
            for i in range(0, frames, frames_per_chunk):
                if len(chunks) >= max_batches:
                    print(f"[STT_BATCHER] Hit max limit of {max_batches} batches (5 mins). Truncating remaining audio.")
                    break
                    
                w.setpos(i)
                chunk_frames = w.readframes(frames_per_chunk)
                
                # Create a new in-memory WAV file for this chunk
                out_io = io.BytesIO()
                with wave.open(out_io, 'wb') as out_w:
                    out_w.setparams(w.getparams())
                    out_w.writeframes(chunk_frames)
                
                chunks.append(out_io.getvalue())
                
    except Exception as e:
        print(f"[STT_BATCHER] Error splitting WAV: {e}")
        # Fallback: if we fail to parse, just return the whole thing and let the API try
        if not chunks:
            chunks.append(wav_bytes)
            
    return chunks

async def _transcribe_single_chunk(client: httpx.AsyncClient, wav_chunk: bytes, stt_code: str, chunk_index: int) -> str:
    """Calls the Sarvam API for a single WAV chunk."""
    try:
        response = await client.post(
            f"{BASE_URL}/speech-to-text",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": (f"chunk_{chunk_index}.wav", wav_chunk, "audio/wav")},
            data={
                "language_code": stt_code,
                "model": "saaras:v3",
                "with_timestamps": "false",
            },
        )
        if response.status_code != 200:
            print(f"[STT_BATCHER] Chunk {chunk_index} failed: {response.status_code} — {response.text[:100]}")
            return ""
            
        transcript = response.json().get("transcript", "").strip()
        print(f"[STT_BATCHER] Chunk {chunk_index} success: '{transcript}'")
        return transcript
        
    except Exception as e:
        print(f"[STT_BATCHER] Chunk {chunk_index} network error: {e}")
        return ""

async def batch_transcribe_audio(audio_bytes: bytes, language: str = "en-IN") -> str:
    """
    Main entry point for batch processing.
    1. Converts incoming webm/raw audio to a clean 16kHz WAV.
    2. Slices the WAV into 30-second batches (max 10).
    3. Sends all batches to the STT API (sequentially to avoid rate limits).
    4. Stitches the resulting text together.
    """
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en-IN"])
    stt_code = lang_config["stt_code"]

    # 1. Convert to clean WAV (this uses ffmpeg which now allows unrestricted length)
    print(f"[STT_BATCHER] Converting input audio of size {len(audio_bytes)} bytes...")
    wav_bytes = convert_to_wav(audio_bytes)

    # 2. Slice into 30s chunks
    chunks = split_wav_into_batches(wav_bytes, chunk_duration_sec=30, max_batches=10)
    print(f"[STT_BATCHER] Audio split into {len(chunks)} batch(es).")

    if not chunks:
        return ""

    # 3. Transcribe chunks
    transcripts = []
    
    # We process sequentially to be nice to the API rate limits and keep text strictly ordered.
    # If speed is paramount, this could be refactored to asyncio.gather with ordered results.
    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, chunk in enumerate(chunks):
            print(f"[STT_BATCHER] Processing chunk {i+1}/{len(chunks)} ({len(chunk)} bytes)...")
            text = await _transcribe_single_chunk(client, chunk, stt_code, i+1)
            if text:
                transcripts.append(text)

    # 4. Stitch transcripts
    final_transcript = " ".join(transcripts).strip()
    print(f"[STT_BATCHER] Final stitched transcript: '{final_transcript}'")
    
    return final_transcript
