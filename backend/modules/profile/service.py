"""
Persona Updater — Updates the UserPersonaProfile at the end of each session.

This is a living psychological profile that tracks behavioral change over time:
  - Communication style (expressive/guarded/chatty/quiet)
  - Processing preference (venting vs problem-solving)
  - Life focus areas extracted from topics discussed
  - Emotion range and dominant emotion
  - Absolutism score and message length trends
  - Behavioral notes (AI-generated narrative summary, updated each session)

Called at end-of-session (or every N messages) by consultation.py.
"""
from __future__ import annotations
import os
from typing import List, Optional
from sqlalchemy.orm import Session
from openai import OpenAI
from dotenv import load_dotenv
import pathlib

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
MODEL = "sarvam-105b"

LIFE_DOMAINS = [
    "work", "career", "relationships", "family", "health", "identity",
    "creativity", "finances", "grief", "anxiety", "self-worth", "loneliness",
    "academic", "social", "spirituality", "purpose",
]

STYLE_KEYWORDS = {
    "expressive": ["feel", "feeling", "emotion", "heart", "deeply", "overwhelming", "honest"],
    "guarded":    ["fine", "okay", "nothing", "whatever", "idk", "forget it", "never mind"],
    "chatty":     [],   # Inferred from high message count + long messages
    "quiet":      [],   # Inferred from few messages + short messages
}

PROCESSING_KEYWORDS = {
    "venting":          ["just need to", "i just want to talk", "let me vent", "nobody listens", "needed to say"],
    "problem_solving":  ["what should i do", "how do i", "any advice", "what can i", "solution", "fix"],
}


def _infer_communication_style(
    messages: List[str],
    avg_length: float,
    count: int,
) -> str:
    text = " ".join(messages).lower()
    expressive = sum(1 for kw in STYLE_KEYWORDS["expressive"] if kw in text)
    guarded    = sum(1 for kw in STYLE_KEYWORDS["guarded"]    if kw in text)
    if expressive > guarded and avg_length > 60:
        return "expressive"
    if guarded > expressive or avg_length < 20:
        return "guarded"
    if count > 10 and avg_length > 50:
        return "chatty"
    if count < 5 or avg_length < 25:
        return "quiet"
    return "mixed"


def _infer_processing_preference(messages: List[str]) -> str:
    text = " ".join(messages).lower()
    venting  = sum(1 for kw in PROCESSING_KEYWORDS["venting"]         if kw in text)
    solving  = sum(1 for kw in PROCESSING_KEYWORDS["problem_solving"]  if kw in text)
    if venting > solving:
        return "venting"
    if solving > venting:
        return "problem_solving"
    return "both"


def _extract_life_focus(messages: List[str]) -> List[str]:
    text = " ".join(messages).lower()
    return [domain for domain in LIFE_DOMAINS if domain in text][:6]  # cap at 6


def _absolutism_score_from_messages(messages: List[str]) -> float:
    from rag.brain.pattern_analyzer import _absolutism_score
    if not messages:
        return 0.0
    scores = [_absolutism_score(m) for m in messages]
    return round(sum(scores) / len(scores), 3)


def _length_trend(lengths: List[int]) -> str:
    if len(lengths) < 3:
        return "stable"
    diffs = [lengths[i] - lengths[i-1] for i in range(1, len(lengths))]
    avg = sum(diffs) / len(diffs)
    if avg < -10:
        return "decreasing"
    if avg > 10:
        return "increasing"
    return "stable"


def _generate_behavioral_note(
    user_messages: List[str],
    emotions: List[str],
    style: str,
    preference: str,
    focus_areas: List[str],
    existing_note: Optional[str],
) -> str:
    """Use LLM to write a short updated behavioral note (max 80 words)."""
    client = OpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL)

    context = f"""
You are a clinical psychology observer. Based on this session's data, write a SHORT (max 80 words) updated behavioral observation note about this user. 
Be specific, clinical in tone, and note any change from the previous note.

Previous note: {existing_note or "None (first session)"}
Communication style this session: {style}
Processing preference: {preference}  
Life focus areas mentioned: {', '.join(focus_areas) if focus_areas else 'not determined'}
Emotion arc this session: {' -> '.join(emotions[-6:]) if emotions else 'None'}
Sample messages (last 3): {'; '.join(user_messages[-3:]) if user_messages else 'None'}

Write the updated note. Be brief. No bullet points. Clinical but human.
"""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": context}],
            temperature=0.3,
            max_tokens=120,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as e:
        print(f"[PersonaUpdater] LLM note failed: {e}")
        return existing_note or ""


def update_persona(
    db: Session,
    user_id: int,
    session_message_lengths: List[int],
    session_emotions: List[str],
    user_messages: List[str],
    is_first_session: bool = False,
    initial_topic: Optional[str] = None,
):
    """
    Update (or create) the UserPersonaProfile for this user based on the current session.
    Called at end of session or periodically during a long session.
    """
    from core.database.models import UserPersonaProfile

    persona = db.query(UserPersonaProfile).filter(
        UserPersonaProfile.user_id == user_id
    ).first()

    if persona is None:
        persona = UserPersonaProfile(user_id=user_id)
        db.add(persona)

    if not user_messages:
        db.commit()
        return

    avg_len = sum(session_message_lengths) / max(len(session_message_lengths), 1)
    style   = _infer_communication_style(user_messages, avg_len, len(user_messages))
    pref    = _infer_processing_preference(user_messages)
    focus   = _extract_life_focus(user_messages)
    abso    = _absolutism_score_from_messages(user_messages)
    trend   = _length_trend(session_message_lengths)

    # Emotion range: merge with existing
    existing_range: List[str] = persona.emotional_range or []
    combined_range = list(set(existing_range + session_emotions))
    from collections import Counter
    all_emotions_seen = existing_range + session_emotions
    dominant = Counter(all_emotions_seen).most_common(1)[0][0] if all_emotions_seen else None

    # Behavioral note (LLM-generated, ~80 words)
    note = _generate_behavioral_note(
        user_messages, session_emotions, style, pref, focus, persona.behavioral_notes
    )

    # Write updates
    persona.communication_style      = style
    persona.processing_preference    = pref
    persona.life_focus_areas         = focus
    persona.language_absolutism_score = abso
    persona.avg_message_length_trend  = trend
    persona.emotional_range           = combined_range
    persona.dominant_emotion          = dominant
    persona.behavioral_notes          = note

    if is_first_session and initial_topic:
        persona.initial_presenting_topic = initial_topic
        persona.onboarding_complete       = True

    db.commit()
    print(f"[PersonaUpdater] Updated persona for user {user_id}: style={style}, pref={pref}")


def get_persona_summary(db: Session, user_id: int) -> str:
    """Return a compact text summary of the user persona for the Analyst prompt."""
    from core.database.models import UserPersonaProfile

    persona = db.query(UserPersonaProfile).filter(
        UserPersonaProfile.user_id == user_id
    ).first()

    if not persona:
        return ""

    parts = []
    if persona.communication_style and persona.communication_style != "unknown":
        parts.append(f"Communication style: {persona.communication_style}")
    if persona.processing_preference and persona.processing_preference != "unknown":
        parts.append(f"Processing preference: {persona.processing_preference}")
    if persona.life_focus_areas:
        parts.append(f"Life focus areas: {', '.join(persona.life_focus_areas)}")
    if persona.dominant_emotion:
        parts.append(f"Dominant emotion (historical): {persona.dominant_emotion}")
    if persona.behavioral_notes:
        parts.append(f"Clinical observation: {persona.behavioral_notes}")
    if persona.initial_presenting_topic:
        parts.append(f"Originally came to Maitri about: {persona.initial_presenting_topic}")

    # Inject raw onboarding JSON for deepest context
    from core.database.models import UserOnboarding
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    if onboarding and onboarding.raw_responses:
        import json
        parts.append(f"\n[Raw Onboarding Context]\n{json.dumps(onboarding.raw_responses)}")

    return "\n".join(parts)
