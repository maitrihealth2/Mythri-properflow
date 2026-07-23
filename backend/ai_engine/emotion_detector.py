import re
import os
import httpx
import asyncio
from dataclasses import dataclass
from dotenv import load_dotenv
import pathlib

_BASE = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN") or os.getenv("HF_TOKEN")
HF_MODEL = "SamLowe/roberta-base-go_emotions"
HF_API_DISABLED = False

_emotion_pipeline = None

def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        try:
            from transformers import pipeline
            print(f"[HF Emotion] Loading local transformers pipeline for {HF_MODEL}...")
            # top_k=1 returns [[{'label': '...', 'score': ...}]] format in recent versions, 
            # or [{'label': '...', 'score': ...}] depending on version. We'll handle both.
            _emotion_pipeline = pipeline("text-classification", model=HF_MODEL, top_k=1)
        except Exception as e:
            print(f"[HF Emotion] Error loading pipeline: {e}")
            _emotion_pipeline = "FAILED"
    return _emotion_pipeline

EMOTION_KEYWORDS = {
    "Admiration": ["admire", "impress", "respect", "amazing", "wow", "brilliant", "admiration", "arputham", "adbhutam"],
    "Amusement": ["funny", "hilarious", "laugh", "haha", "lol", "lmao", "amused", "joke", "sirippu", "navvu"],
    "Anger": ["angry", "mad", "furious", "pissed", "hate", "gussa", "kopam", "kovam", "anger", "rage"],
    "Annoyance": ["annoyed", "irritating", "bothering", "frustrated", "fed up", "chiraaku", "erichal", "annoyance"],
    "Approval": ["approve", "agree", "perfect", "good idea", "exactly", "yes", "sahi", "sari", "correct"],
    "Caring": ["care", "worry about", "support", "here for you", "sympathy", "caring", "fikr"],
    "Confusion": ["confused", "lost", "don't understand", "huh", "what do you mean", "confusion", "ulappal"],
    "Curiosity": ["curious", "wonder", "why", "how", "interesting", "curiosity", "aacharyam"],
    "Desire": ["want", "wish", "need", "crave", "desire", "chah", "aasai", "korika"],
    "Disappointment": ["disappointed", "let down", "bummer", "sadly", "unfortunate", "niraasa", "ematram"],
    "Disapproval": ["disapprove", "disagree", "bad idea", "no way", "terrible", "disapproval", "manzoor nahi"],
    "Disgust": ["disgusting", "gross", "ew", "nasty", "sickening", "yuck", "disgust", "chi", "assehyam"],
    "Embarrassment": ["embarrassed", "awkward", "humiliated", "cringe", "ashamed", "sharam", "avamanam"],
    "Excitement": ["excited", "thrilled", "can't wait", "pumped", "yay", "excitement", "utsaha", "kushi"],
    "Fear": ["fear", "scared", "terrified", "panic", "dread", "darr", "bayam", "bhayam"],
    "Gratitude": ["thank you", "thanks", "grateful", "appreciate", "blessed", "shukriya", "nandri", "dhanyavadalu"],
    "Grief": ["grief", "loss", "mourn", "devastated", "heartbroken", "passed away", "shok", "maranam"],
    "Joy": ["joy", "happy", "glad", "delighted", "khush", "santhosham", "magizhchi", "aanandam"],
    "Love": ["love", "adore", "affection", "pyaar", "kadhal", "prema", "anbu"],
    "Nervousness": ["nervous", "anxious", "worried", "uneasy", "tension", "chinta", "kavalai"],
    "Optimism": ["optimistic", "hopeful", "looking forward", "positive", "confident", "asha"],
    "Pride": ["proud", "accomplished", "achievement", "success", "garv", "perumai", "garvam"],
    "Realization": ["realize", "oh", "figured out", "makes sense", "now I see", "samajh aaya"],
    "Relief": ["relieved", "phew", "thank god", "safe", "glad that's over", "rahat", "nimmadhi"],
    "Remorse": ["remorse", "sorry", "guilty", "regret", "apologize", "my fault", "pachchatapam"],
    "Sadness": ["sad", "depressed", "unhappy", "cry", "tears", "udaas", "dukh", "sadness", "sogam"],
    "Surprise": ["surprise", "shocked", "wow", "unexpected", "omg", "hairani", "aacharyam"],
    "Neutral": ["okay", "alright", "fine", "nothing", "whatever", "theek", "sari"],
}

EMOTION_EMOJI = {
    "Admiration": "🤩", "Amusement": "😂", "Anger": "😡", "Annoyance": "😒",
    "Approval": "👍", "Caring": "🤗", "Confusion": "😕", "Curiosity": "🤔",
    "Desire": "🤤", "Disappointment": "😞", "Disapproval": "👎", "Disgust": "🤢",
    "Embarrassment": "😳", "Excitement": "🤩", "Fear": "😨", "Gratitude": "🙏",
    "Grief": "😭", "Joy": "😄", "Love": "❤️", "Nervousness": "😰",
    "Optimism": "🤞", "Pride": "😌", "Realization": "💡", "Relief": "😮‍💨",
    "Remorse": "😔", "Sadness": "😢", "Surprise": "😲", "Neutral": "😐",
    "Crisis": "🚨"
}

# Mapping GoEmotions (28 labels) directly to their Capitalized UI Categories
GO_EMOTIONS_MAP = {
    "admiration": "Admiration", "amusement": "Amusement", "anger": "Anger", 
    "annoyance": "Annoyance", "approval": "Approval", "caring": "Caring",
    "confusion": "Confusion", "curiosity": "Curiosity", "desire": "Desire",
    "disappointment": "Disappointment", "disapproval": "Disapproval", "disgust": "Disgust",
    "embarrassment": "Embarrassment", "excitement": "Excitement", "fear": "Fear",
    "gratitude": "Gratitude", "grief": "Grief", "joy": "Joy", "love": "Love",
    "nervousness": "Nervousness", "optimism": "Optimism", "pride": "Pride",
    "realization": "Realization", "relief": "Relief", "remorse": "Remorse",
    "sadness": "Sadness", "surprise": "Surprise", "neutral": "Neutral"
}

@dataclass
class EmotionResult:
    label: str          # e.g. "Anxiety"
    emoji: str          # e.g. "😰"
    score: float        # confidence
    raw_label: str      # internal label

def detect_emotion_heuristic(text: str) -> EmotionResult:
    """Keyword-based fallback for low latency."""
    lower = text.lower().strip()
    counts = {label: 0 for label in EMOTION_KEYWORDS.keys()}
    for label, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                counts[label] += 1
    
    best_label = "Neutral"
    max_count = 0
    for label, count in counts.items():
        if count > max_count:
            max_count = count; best_label = label
            
    score = min(max_count * 0.4 + 0.5, 1.0) if max_count > 0 else 0.0
    return EmotionResult(best_label, EMOTION_EMOJI.get(best_label, "😐"), score, best_label.lower())


async def detect_emotion(text: str) -> EmotionResult:
    global HF_API_DISABLED
    """
    Main entry point — Deep Learning with Keyword Fallback.
    """
    if not text.strip():
        return EmotionResult("Neutral", "😐", 0.0, "neutral")

    # If no token or if API previously failed, use heuristic immediately
    if not HF_TOKEN or HF_API_DISABLED:
        return detect_emotion_heuristic(text)

    try:
        # Use local transformers pipeline. Load it in a background thread to avoid blocking loop.
        pipe = await asyncio.to_thread(get_emotion_pipeline)
        
        if pipe and pipe != "FAILED":
            # Run the heavy inference in a background thread
            results = await asyncio.to_thread(pipe, text)
            
            if results:
                # pipeline(top_k=1) returns either a list of lists (batch) or a list of dicts.
                if isinstance(results, list) and isinstance(results[0], list):
                    top_match = results[0][0]
                elif isinstance(results, list) and isinstance(results[0], dict):
                    top_match = results[0]
                else:
                    top_match = None
                    
                if top_match:
                    hf_label = top_match["label"]
                    score = top_match["score"]
                    
                    category = GO_EMOTIONS_MAP.get(hf_label, "Neutral")
                    print(f"[Local HF Emotion] Detected '{hf_label}' -> '{category}' ({score:.2f})")
                    
                    return EmotionResult(
                        label=category,
                        emoji=EMOTION_EMOJI.get(category, "😐"),
                        score=float(score),
                        raw_label=hf_label
                    )
    except Exception as e:
        print(f"[Local HF Emotion] Unexpected error: {e}, falling back.")
        
    return detect_emotion_heuristic(text)

if __name__ == "__main__":
    # Test cases
    tests = [
        "I am so stressed about my exams",
        "I feel lonely and sad",
        "Mujhe bahut gussa aa raha hai",
        "I had a great day!",
        "Normal sentence here.",
    ]
    print("Testing locally...")
    for t in tests:
        # Note: Local test needs to run loop
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(detect_emotion(t))
        print(f"{res.emoji} {res.label:8} | {t}")
