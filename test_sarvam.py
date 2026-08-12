import asyncio
import sys
import os
import wave
import io

# Add backend to sys.path so we can import from backend.providers.sarvam
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from providers.sarvam.voice_client import synthesize_speech, transcribe_audio, close_http_client

def generate_dummy_wav():
    # Generate 1 second of silence at 16kHz
    out_io = io.BytesIO()
    with wave.open(out_io, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\x00' * 16000 * 2)
    return out_io.getvalue()

async def test_all():
    try:
        print("Testing TTS with Bulbul v3...")
        audio = await synthesize_speech(
            text="Hello, this is a test of the Sarvam Text to Speech API.",
            language="en-IN",
            gender="female",
            emotion="Neutral"
        )
        if audio and len(audio) > 0:
            print(f"TTS SUCCESS! Generated audio length: {len(audio)} bytes.")
        else:
            print("TTS FAILED! Returned empty audio.")
            
        print("\nTesting STT with Saaras v3...")
        dummy_wav = generate_dummy_wav()
        # transcribe_audio expects webm typically because of ffmpeg conversion in it, 
        # but ffmpeg can also handle wav input.
        transcript = await transcribe_audio(dummy_wav, language="en-IN")
        print(f"STT SUCCESS! Transcript: '{transcript}'")
        
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await close_http_client()

if __name__ == "__main__":
    asyncio.run(test_all())

