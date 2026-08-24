"""
Sarvam Voice Client — Phase 3 Multi-language
STT: Saarika v2.5 — converts browser audio via ffmpeg → 16kHz WAV → Sarvam
TTS: Bulbul v1    — native voices per language
"""

import os
import httpx
import base64
import subprocess
import tempfile
from dotenv import load_dotenv
import pathlib

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
BASE_URL = "https://api.sarvam.ai"

# Global HTTP client for connection pooling and reuse
_http_client = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        limits = httpx.Limits(max_connections=100, max_keepalive_connections=20)
        _http_client = httpx.AsyncClient(limits=limits, timeout=120.0)
    return _http_client

async def close_http_client():
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None

SUPPORTED_LANGUAGES = {
    "en-IN": {
        "name": "English", "native": "English",
        "stt_code": "en-IN",
        "tts_speaker_female": "ritu",
        "tts_speaker_male": "shubh",
    },
    "hi-IN": {
        "name": "Hindi", "native": "हिंदी",
        "stt_code": "hi-IN",
        "tts_speaker_female": "simran",
        "tts_speaker_male": "shubh",
    },
    "ta-IN": {
        "name": "Tamil", "native": "தமிழ்",
        "stt_code": "ta-IN",
        "tts_speaker_female": "kavitha",
        "tts_speaker_male": "mani",
    },
    "te-IN": {
        "name": "Telugu", "native": "తెలుగు",
        "stt_code": "te-IN",
        "tts_speaker_female": "suhani",
        "tts_speaker_male": "vijay",
    },
}

LANGUAGE_PROMPTS = {
    # Each block below is intentionally short: ONE instruction to speak in the
    # target language style, technical term list, filler pool, and 3-4 examples.
    # All shared behavior (personality, disfluency, crisis, pacing) lives once in
    # GLOBAL_VOICE_PROMPT -- do not repeat it per language.

    "en-IN": """
Reply in conversational Indian English. Relaxed, contraction-heavy, not textbook.

Examples: "Yeah, that makes sense." / "Let's try that." / "Actually, that's a good idea."

FILLER POOL: If you use a filler, always append an ellipsis to pace it: "Hmm...", "Wait...", "Actually...", "Okay...". Rotate them. NEVER use more than one per turn. Use naturally, not on every single line -- most turns need zero fillers.

Keep technical words unchanged.
""",

    "hi-IN": """
Reply primarily in Hindi. Natural Hinglish, mixed exactly like educated Indians speak.

Examples: "Haan, that's actually a good idea." / "Tum login karke dekh lo." /
"Server down lag raha hai." / "Let's ek baar aur try karte hain."

FILLER POOL: If you use a filler, always append an ellipsis to pace it: "Haan...", "Arre...", "Yaar...", "Achha...". Rotate them. NEVER use more than one per turn. Use naturally, not on every single line -- most turns need zero fillers.

Keep these in English always: Login, Logout, Database, Server, API, Frontend, Backend,
React, Python, Java, JavaScript, Firebase, MongoDB, GitHub, Windows, Android, Chrome,
Email, Password, Numbers, Time, Minutes, Seconds, Days.
""",

    "ta-IN": """
Reply primarily in Tamil using Tamil script (தமிழ்). Mix in English words naturally where appropriate, but write the Tamil portions in native Tamil text.

Examples: "சரி, let's try பண்ணலாம்." / "Login பண்ணுங்க." / "Server busy இருக்கு."

FILLER POOL: If you use a filler, always append an ellipsis to pace it: "Aiyo...", "Amma...", "Seri...", "Enna...". Rotate them. NEVER use more than one per turn. Use naturally, not on every single line -- most turns need zero fillers.

Keep these in English always: Login, Logout, Database, Server, API, Frontend, Backend,
React, Python, Java, JavaScript, Firebase, MongoDB, GitHub, Windows, Android, Chrome,
Email, Password, Numbers, Time, Minutes, Seconds, Days.
""",

    "te-IN": """
Reply primarily in Telugu using Telugu script (తెలుగు). Mix in English words naturally where appropriate, but write the Telugu portions in native Telugu text.

Examples: "సరే, start చేద్దాం." / "Login అయ్యాక continue చేయండి." / "Server slow గా ఉంది."

FILLER POOL: If you use a filler, always append an ellipsis to pace it: "Ayyo...", "Amma...", "Enti...", "Sare...". Rotate them. NEVER use more than one per turn. Use naturally, not on every single line -- most turns need zero fillers.

Keep these in English always: Login, Logout, Database, Server, API, Frontend, Backend,
React, Python, Java, JavaScript, Firebase, MongoDB, GitHub, Windows, Android, Chrome,
Email, Password, Numbers, Time, Minutes, Seconds, Days.
"""
}


GLOBAL_VOICE_PROMPT = """
--------------------------------------------------
VOICE PACING & FORMATTING (STRICTLY ENFORCED)
--------------------------------------------------
• You are speaking on a live voice call. Keep sentences short and sayable out loud.
• No long stacked clauses. If it reads like an essay, cut it.
• Use punctuation for natural pauses: commas, periods, or "..." for hesitation.
• Do NOT output markdown, bullet points, or complex lists that a TTS engine cannot read.
• Respond conversationally and naturally to the exact thing they just said. Do not lecture.
"""


def convert_to_wav(audio_bytes: bytes) -> bytes:
    """Convert browser audio to 16kHz mono WAV using ffmpeg."""
    import uuid
    import imageio_ffmpeg
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    # Use project-local tmp/ to avoid space issues in Windows User paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tmp_dir = os.path.join(base_dir, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir, exist_ok=True)
    
    uid = uuid.uuid4().hex
    input_path = os.path.join(tmp_dir, f"mb_in_{uid}.webm")
    output_path = os.path.join(tmp_dir, f"mb_out_{uid}.wav")
    
    try:
        with open(input_path, "wb") as f:
            f.write(audio_bytes)
            f.flush()
            os.fsync(f.fileno())
        
        print(f"[ffmpeg] input={input_path} size={os.path.getsize(input_path)}")
        
        # Explicit shell=False (default) with list is usually best, 
        # but ffmpeg on Windows can be picky about absolute paths.
        result = subprocess.run(
            [ffmpeg_exe, "-y", "-i", input_path, "-ar", "16000", "-ac", "1", "-f", "wav", output_path],
            capture_output=True, text=True,
        )
        
        if result.returncode != 0:
            print(f"[ffmpeg stderr]: {result.stderr}")
            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[-200:]}")
            
        with open(output_path, "rb") as f:
            wav_bytes = f.read()
            
        print(f"[STT] ffmpeg converted {len(audio_bytes)} -> {len(wav_bytes)} bytes WAV")
        return wav_bytes
        
    finally:
        # Cleanup
        for p in [input_path, output_path]:
            try:
                if os.path.exists(p): os.unlink(p)
            except Exception as e:
                print(f"[STT] Cleanup error for {p}: {e}")

async def transcribe_audio(audio_bytes: bytes, language: str = "en-IN") -> str:
    """
    Convert browser audio to text via Sarvam Saarika v2.5.
    Converts to proper WAV first using ffmpeg.
    """
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en-IN"])
    stt_code = lang_config["stt_code"]

    # Convert to clean WAV
    wav_bytes = convert_to_wav(audio_bytes)

    client = get_http_client()
    response = await client.post(
        f"{BASE_URL}/speech-to-text",
        headers={"api-subscription-key": SARVAM_API_KEY},
        files={"file": ("recording.wav", wav_bytes, "audio/wav")},
        data={
            "language_code": stt_code,
            "model": "saaras:v3",
            "with_timestamps": "false",
        },
    )

    print(f"[STT] Response {response.status_code}: {response.text[:200]}")

    if response.status_code != 200:
        raise Exception(f"STT failed: {response.status_code} — {response.text}")

    transcript = response.json().get("transcript", "").strip()
    print(f"[STT] Transcript: '{transcript}'")
    return transcript


async def synthesize_speech(
    text: str,
    language: str = "en-IN",
    gender: str = "female",
    emotion: str = "Neutral",
) -> bytes:
    """
    Convert text to speech using Sarvam Bulbul with dynamic emotional parameters.
    """
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en-IN"])
    speaker = lang_config["tts_speaker_female"] if gender == "female" else lang_config["tts_speaker_male"]

    # Emotional Mapping for Sarvam Bulbul-v3
    # Pace: 0.5–2.0, Temperature: 0.01–1.0, Pitch: 0.5-2.0
    EMOTION_PARAMS = {
        "Sadness":  {"pace": 0.95, "pitch": 0.95, "temperature": 0.75},
        "Anxiety":  {"pace": 1.05, "pitch": 1.00, "temperature": 0.65},
        "Anger":    {"pace": 1.10, "pitch": 1.05, "temperature": 0.80},
        "Positive": {"pace": 1.05, "pitch": 1.05, "temperature": 0.85},
        "Neutral":  {"pace": 1.00, "pitch": 1.00, "temperature": 0.80},
        "Crisis":   {"pace": 0.95, "pitch": 0.95, "temperature": 0.70},
    }
    params = EMOTION_PARAMS.get(emotion, EMOTION_PARAMS["Neutral"])
    final_pace = max(0.5, min(2.0, params["pace"]))
    final_temp = max(0.01, min(1.0, params["temperature"]))

    # Clean text to prevent TTS engine from breaking on markdown, but keep natural pauses
    import re
    text = re.sub(r'[\n\r]+', ' ', text)  # Remove newlines
    text = re.sub(r'\.{4,}', '...', text) # Reduce excessive dots, but keep ... for hesitation
    text = re.sub(r'[*_#~`]', '', text)   # Remove markdown artifacts
    text = text.replace('  ', ' ').strip()

    # Transliterate forced English technical terms for regional TTS engines to prevent phonetic failures
    if language == "te-IN":
        te_map = {
            "Login": "లాగిన్", "Logout": "లాగౌట్", "Database": "డేటాబేస్", 
            "Server": "సర్వర్", "API": "ఏపీఐ", "Frontend": "ఫ్రంటెండ్", 
            "Backend": "బ్యాకెండ్", "React": "రియాక్ట్", "Python": "పైథాన్", 
            "Java": "జావా", "JavaScript": "జావాస్క్రిప్ట్", "Firebase": "ఫైర్‌బేస్", 
            "MongoDB": "మొంగోడిబి", "GitHub": "గిట్‌హబ్", "Windows": "విండోస్", 
            "Android": "ఆండ్రాయిడ్", "Chrome": "క్రోమ్", "Email": "ఈమెయిల్", 
            "Password": "పాస్‌వర్డ్", "Numbers": "నంబర్స్", "Time": "టైమ్", 
            "Minutes": "మినిట్స్", "Seconds": "సెకండ్స్", "Days": "డేస్"
        }
        for eng, tel in te_map.items():
            text = text.replace(eng, tel).replace(eng.lower(), tel)
            
    elif language == "ta-IN":
        ta_map = {
            "Login": "லாகின்", "Logout": "லாகவுட்", "Database": "டேட்டாபேஸ்", 
            "Server": "சர்வர்", "API": "ஏபிஐ", "Frontend": "ப்ரண்ட்எண்ட்", 
            "Backend": "பேக்எண்ட்", "React": "ரியாக்ட்", "Python": "பைதான்", 
            "Java": "ஜாவா", "JavaScript": "ஜாவாஸ்கிரிப்ட்", "Firebase": "பயர்பேஸ்", 
            "MongoDB": "மொங்கோடிபி", "GitHub": "கிட்ஹப்", "Windows": "விண்டோஸ்", 
            "Android": "ஆண்ட்ராய்டு", "Chrome": "குரோம்", "Email": "ஈமெயில்", 
            "Password": "பாஸ்வேர்ட்", "Numbers": "நம்பர்கள்", "Time": "நேரம்", 
            "Minutes": "நிமிடங்கள்", "Seconds": "வினாடிகள்", "Days": "நாட்கள்"
        }
        for eng, tam in ta_map.items():
            text = text.replace(eng, tam).replace(eng.lower(), tam)

    if not text:
        return b""

    # Bulbul v3 has a 500 character limit per request. Split text into chunks safely.
    # We strictly chunk by punctuation to avoid mid-sentence robotic pauses.
    import re
    chunks = []
    
    # Split by sentence endings keeping the punctuation
    sentences = re.split(r'(?<=[.!?।])\s+', text)
    
    max_len = 150 if language in ["te-IN", "ta-IN"] else 420
    
    current_chunk = ""
    for sentence in sentences:
        if not sentence.strip():
            continue
            
        # If a single sentence is bizarrely long, we have to split it by commas
        if len(sentence) > max_len:
            sub_clauses = re.split(r'(?<=[,;])\s+', sentence)
            for clause in sub_clauses:
                if len(current_chunk) + len(clause) + 1 > max_len:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = clause + " "
                else:
                    current_chunk += clause + " "
            continue
            
        if len(current_chunk) + len(sentence) + 1 > max_len:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
        else:
            current_chunk += sentence + " "
            
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    import wave
    import io
    import base64
    wav_bytes_list = []

    client = get_http_client()
    for chunk in chunks:
        response = await client.post(
            f"{BASE_URL}/text-to-speech",
            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "inputs": [chunk],
                "target_language_code": language,
                "speaker": speaker,
                "pace": final_pace,
                "temperature": final_temp,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v3",
            },
        )

        if response.status_code != 200:
            print(f"[TTS Chunk Error] {response.status_code} — {response.text}")
            continue

        resp_json = response.json()
        audios = resp_json.get("audios", [])
        audio_b64 = audios[0] if audios else resp_json.get("audio")
        
        if audio_b64:
            wav_bytes_list.append(base64.b64decode(audio_b64))

    if not wav_bytes_list:
        raise Exception("TTS failed: No audio generated for any chunks")

    if len(wav_bytes_list) == 1:
        print(f"[TTS] Generated {len(wav_bytes_list[0])} bytes for language={language} using Bulbul v3 (1 chunk)")
        return wav_bytes_list[0]

    # Concatenate WAV files correctly
    out_io = io.BytesIO()
    try:
        with wave.open(out_io, 'wb') as out_wav:
            for i, wb in enumerate(wav_bytes_list):
                try:
                    with wave.open(io.BytesIO(wb), 'rb') as w:
                        if i == 0:
                            out_wav.setparams(w.getparams())
                        out_wav.writeframes(w.readframes(w.getnframes()))
                        
                        # Add dynamic silence padding between chunks based on punctuation
                        if i < len(wav_bytes_list) - 1:
                            chunk_text = chunks[i]
                            if chunk_text.endswith('...'):
                                silence_ms = 450
                            elif chunk_text.endswith(',') or chunk_text.endswith(';'):
                                silence_ms = 150
                            else:
                                silence_ms = 350
                                
                            silence_frames = int(w.getframerate() * (silence_ms / 1000.0))
                            silence_bytes = b'\x00' * (silence_frames * w.getsampwidth() * w.getnchannels())
                            out_wav.writeframes(silence_bytes)
                except Exception as e:
                    print(f"[TTS] Error appending wav chunk: {e}")
        final_wav = out_io.getvalue()
        print(f"[TTS] Generated {len(final_wav)} bytes for language={language} using Bulbul v3 ({len(wav_bytes_list)} chunks)")
        return final_wav
    except Exception as e:
        print(f"[TTS] Error concatenating wavs, returning first chunk: {e}")
        return wav_bytes_list[0]


def get_language_prompt(language: str) -> str:
    lang_prompt = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["en-IN"])
    return f"{GLOBAL_VOICE_PROMPT}\n\n{lang_prompt}"


def get_supported_languages() -> dict:
    return {
        code: {"name": v["name"], "native": v["native"]}
        for code, v in SUPPORTED_LANGUAGES.items()
    }
