import io
import wave
import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, PitchShift, Compressor, HighShelfFilter, LowShelfFilter, Reverb
from ai_engine.emotion_detector import EmotionResult

def get_prosody_params(emotion_label: str) -> dict:
    """
    Returns pitch semitone shift, compressor strength, and EQ settings based on the 28 emotions.
    Positive values mean higher pitch; negative means lower pitch.
    Base minimisation is applied across the board for a deeper, more human resonance.
    """
    # Base adjustments for "minimised pitch" (more human, slightly deeper baseline)
    base_semitones = -1.5
    
    # Defaults
    params = {
        "semitones": base_semitones,
        "compressor_threshold": -20,
        "compressor_ratio": 2.5,
        "reverb_room_size": 0.1,  # very subtle room feel
        "low_eq_db": 1.0,  # add a bit of warmth
        "high_eq_db": -1.0 # roll off harsh high frequencies
    }

    # Group the 28 emotions roughly by intensity and valence
    if emotion_label in ["Sadness", "Grief", "Disappointment", "Remorse", "Embarrassment"]:
        # Softer, deeper, gentler
        params["semitones"] = base_semitones - 1.0  
        params["compressor_threshold"] = -25
        params["low_eq_db"] = 2.0
        params["high_eq_db"] = -3.0
        
    elif emotion_label in ["Anger", "Annoyance", "Disapproval", "Disgust"]:
        # Deep, resonant, forceful
        params["semitones"] = base_semitones - 2.0
        params["compressor_ratio"] = 4.0
        params["low_eq_db"] = 3.0
        
    elif emotion_label in ["Fear", "Nervousness"]:
        # Slightly higher pitched due to tension, but still minimised from baseline TTS
        params["semitones"] = base_semitones + 0.5
        params["reverb_room_size"] = 0.05
        
    elif emotion_label in ["Excitement", "Joy", "Amusement", "Surprise"]:
        # Brighter, slightly higher pitched, lively
        params["semitones"] = base_semitones + 1.0
        params["high_eq_db"] = 1.5
        params["low_eq_db"] = 0.0
        
    elif emotion_label in ["Caring", "Love", "Admiration"]:
        # Warm, comforting, extremely soothing
        params["semitones"] = base_semitones - 1.5
        params["low_eq_db"] = 2.5
        params["high_eq_db"] = -2.0
        params["reverb_room_size"] = 0.15 # slightly more resonant/intimate

    return params

def optimize_pitch(audio_bytes: bytes, emotion_label: str) -> bytes:
    """
    Applies real-time pitch shifting and prosody optimization using Pedalboard.
    Takes raw WAV audio bytes from Sarvam TTS, applies DSP, and returns optimized WAV bytes.
    """
    if not audio_bytes:
        return audio_bytes

    try:
        # 1. Load audio bytes into numpy array
        with io.BytesIO(audio_bytes) as f:
            audio_data, sample_rate = sf.read(f)
            
        # Ensure 2D array if mono
        if len(audio_data.shape) == 1:
            audio_data = np.expand_dims(audio_data, axis=1)
            
        # Soundfile reads as (frames, channels), pedalboard wants (channels, frames)
        audio_data = audio_data.T

        # 2. Get emotion parameters
        params = get_prosody_params(emotion_label)

        # 3. Build DSP chain
        board = Pedalboard([
            Compressor(threshold_db=params["compressor_threshold"], ratio=params["compressor_ratio"]),
            PitchShift(semitones=params["semitones"]),
            LowShelfFilter(cutoff_hz=300, gain_db=params["low_eq_db"]),
            HighShelfFilter(cutoff_hz=4000, gain_db=params["high_eq_db"]),
            Reverb(room_size=params["reverb_room_size"], damping=0.9, dry_level=1.0, wet_level=0.1)
        ])

        # 4. Process audio
        effected = board(audio_data, sample_rate)

        # 5. Convert back to WAV bytes
        effected = effected.T
        
        output_io = io.BytesIO()
        sf.write(output_io, effected, sample_rate, format='WAV', subtype='PCM_16')
        
        optimized_bytes = output_io.getvalue()
        return optimized_bytes

    except Exception as e:
        print(f"[VPPOE] Pitch optimization failed: {e}. Falling back to raw TTS.")
        return audio_bytes
