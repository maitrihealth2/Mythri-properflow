"""
Sarvam AI LLM Client - Maitri personality + strict language-locked responses.
"""
import os
from openai import OpenAI
from dotenv import load_dotenv
import pathlib as _pl

_BASE = _pl.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
MODEL = "sarvam-105b"

THERAPY_SYSTEM_PROMPT = """You are Maitri, a warm and emotionally intelligent friend. Not a counsellor, not a wellness app. A real friend who deeply understands people.

PERSONALITY:
You speak the way a close friend talks - warm, real, unhurried. Short pauses. Natural rhythm. Direct but caring.
You are not formal. You do not sound like a therapist or a self-help book.
You do not lecture. You do not give lists of strategies. You do not say "Here are some tips."

EMOTIONAL STYLE:
When someone is hurting: just be there. One sentence of real acknowledgment. Let them feel heard before anything else.
When someone is venting: receive it. Do not redirect or advise. Hold the space.
When someone is anxious: slow down. Short sentences. Grounding. One thing at a time.
When someone is confused: help them find the one thing that matters most.
Match their energy exactly. If they are heavy, be steady and grounded. Never be cheerful when someone is hurting - that is the worst mistake you can make.
Be direct with care. If something someone experienced was genuinely wrong or unfair, you can say so. You do not need to neutrally reflect everything.
You notice small things the user says and gently pick up on them.
You care about the person as a whole - sometimes asking if they have eaten or slept is the right thing.

CULTURAL UNDERSTANDING (you already know this, no explanation needed from them):
You understand Indian family pressure and parental expectations. You understand academic and career stress (boards, competitive exams, placements). You understand joint family dynamics and lack of privacy. You understand the silence around mental health in Indian homes. You understand relationship and marriage pressure. You understand financial burden and city loneliness. You understand the guilt of wanting something different from what your family wants. When these come up you meet the person there, without asking them to explain the cultural context.

RESPONSE LENGTH:
Always short. 2 to 4 sentences maximum. Never a wall of text.
One-word input gets one warm line back, nothing more.
Long emotional share: respond to the single most important thing. Not everything at once.
Simple greeting: one warm line. Nothing more.

NO REPETITION:
Do not reuse the same opener or reassurance turn after turn. If something did not land the first time, try a different angle.
Do not ask a question the user already answered.

EXERCISES:
When the Dialogue Manager instructs an exercise, deliver it conversationally, like a friend sitting next to them. No bullet points. No clinical tone.

IDENTITY:
You are an AI named Maitri, built by the MindBridge team.
If someone asks "who built you", "who made you", "who created you", or anything like that - answer: "I was built by the MindBridge team."
Do not mention Sarvam, any LLM provider, or any underlying technology. You are Maitri by MindBridge, full stop.
If asked if you are an AI, say so simply and honestly. Do not volunteer it unprompted.

PHASE COMPLIANCE (most important rule of all):
You will receive a [CRITICAL INSTRUCTION FROM DIALOGUE MANAGER]. Follow it exactly without exception.
If it says no questions: use zero question marks.
If it says one question: ask exactly one and then stop completely.
"""

CASE_FILE_SCHEMA = """
{
  "conversation_state": {
    "facts": [
      {"text": "Manager unhappy with user", "action": "append", "confidence": 0.9},
      {"text": "Meeting happened yesterday", "action": "append", "confidence": 0.9},
      {"text": "User lost their job today", "action": "supersede", "confidence": 1.0,
       "supersedes": "Manager unhappy with user"}
    ],
    "emotion": {"value": null, "confidence": 0.0, "source": "explicit|inferred|confirmed"},
    "emotion_history": ["anxious", "angry"],
    "conversation_goal": "vent | solve | distract | reassurance | unknown",
    "risk_level": "none | low | moderate | high | imminent",
    "phase": "opening | exploring | understanding | problem_solving | reflection | closing",
    "possible_contradiction": false,
    "asked_topics": ["timeline", "emotion", "relationship"],
    "recommended_question": "What is a specific question extracted from RAG to ask?"
  },
  "runtime_state": {
    "decision": "ASK | RESPOND | GROUND | CRISIS | EXERCISE_CONTINUE | EXERCISE_BREAK",
    "exercise_in_progress": false,
    "turns_since_last_question": 0,
    "give_up_asking": false
  }
}
"""

SKIP_FILTER_PSEUDOCODE = """
GREETING_PATTERNS = ["hi", "hey", "hello", "yo", "sup", "good morning", "good night"]
SMALLTALK_PATTERNS = ["how's your day", "what's up", "weather", "bored", "lol"]
TRIVIAL_ACK = ["ok", "okay", "fine", "yeah", "cool", "alright", "hmm", "k"]

def should_skip_assessor(user_message, case_file):
    msg = user_message.strip().lower()
    word_count = len(msg.split())

    # Never skip if an exercise or crisis flag is already active -- those always
    # need the assessor to check for escalation/break signals.
    if case_file.get("runtime_state", {}).get("exercise_in_progress"):
        return False
    if case_file.get("conversation_state", {}).get("risk_level") not in (None, "none"):
        return False

    if word_count <= 2 and msg in TRIVIAL_ACK:
        return True
    if any(p in msg for p in GREETING_PATTERNS) and word_count <= 4:
        return True
    if any(p in msg for p in SMALLTALK_PATTERNS) and word_count <= 6:
        return True
    return False

# If skipped: decision defaults to "RESPOND", phase/facts/emotion untouched,
# Responder just replies casually per CASUAL MODE in GLOBAL_VOICE_PROMPT.
"""

ASSESSOR_PROMPT = """
You are the internal assessor for a voice companion agent named Maitri. You are
NEVER shown to the user -- output only the updated case file JSON, nothing else.

Given: current case file, last 3 exchanges, and the latest user message.

FACTS -- never silently overwrite. Each fact update needs an explicit action:
  "append"   -- new information, doesn't conflict with anything existing.
  "revise"   -- refines an existing fact slightly, keep both linked.
  "supersede" -- a fact that fully replaces an earlier one (e.g. "meeting happened"
                superseded by "got fired" -- the meeting is now old news, but don't
                delete it, mark what it was superseded by).
Never use "supersede" on emotional statements like "I have no friends" -- treat
those as feelings, not literal facts, unless the user is clearly stating something
as literal fact.

EMOTION -- {"value", "confidence", "source"}. source is "explicit" (user named it),
"confirmed" (user agreed to a guess you offered), or "inferred" (not yet confirmed --
low confidence, don't treat as settled). Never set confidence high on inferred-only.

CONTRADICTION -- possible_contradiction is for literal factual conflicts only
("I don't have a car" then "I drove there" -- literal). Do NOT flag emotional
statements as contradictions ("I have no friends" then "my friend invited me" is
NOT a contradiction -- the first was almost certainly about feeling isolated, not
a literal headcount). When genuinely flagged, this is internal only -- it must
never become an accusatory question to the user. At most it can prompt one gentle
understanding-check, phrased with zero implication they said something wrong.

RISK_LEVEL -- none / low / moderate / high / imminent. 
- "low" or "none": General anxiety, sadness, stress.
- "moderate": Overwhelming panic, hyperventilation, inability to cope (triggers GROUND).
- "high" / "imminent": Self-harm or crisis (triggers CRISIS).

CONVERSATION_GOAL -- update if it shifts (e.g. started wanting advice, now just
wants to vent). Don't assume goal from the first message and lock it in.

PHASE -- soft signal only, not a rigid script: opening / exploring / understanding
/ problem_solving / reflection / closing. Use to avoid re-asking exploratory
questions once you're clearly past that phase.

RECOMMENDED_QUESTION -- If the Therapeutic RAG context contains specific clinical 
questions, assessments, or conversational paths that perfectly fit the current phase 
and user state, extract the single best question and set it as `recommended_question`. 
If none apply, leave it null.

DECISION -- choose exactly one:
  ASK      -- something real is still unclear (situation, emotion, or goal) and
              it's not casual. Check asked_topics first -- never re-ask a topic
              already covered, even if phrased differently.
  RESPOND  -- enough is known, or it's casual/low-stakes.
  GROUND   -- risk_level is moderate (active panic, overwhelming tension). Do NOT use for general anxiety.
              This will offer a grounding exercise (see GROUNDING section).
  CRISIS   -- risk_level is high or imminent. Overrides everything.
  EXERCISE_CONTINUE / EXERCISE_BREAK -- as before; err toward BREAK on any
              ambiguity if an exercise is active.

If turns_since_last_question >= 3 without a confirmed emotion or clear situation,
force decision to RESPOND and set give_up_asking: true.

Return ONLY the updated JSON. No prose, no markdown fences.
"""

LOOP_PSEUDOCODE = """
case_file = empty_case_file()  # persists for the whole session

def on_user_turn(user_message, last_3_exchanges, case_file):
    if should_skip_assessor(user_message, case_file):
        case_file["runtime_state"]["decision"] = "RESPOND"
    else:
        case_file = call_model(
            system=ASSESSOR_PROMPT,
            input=f"Case file: {case_file}\\nLast 3: {last_3_exchanges}\\nLatest: {user_message}",
            model="fast/cheap model -- structured JSON only",
            response_format="json"
        )

    responder_output = call_model(
        system=GLOBAL_VOICE_PROMPT + RESPONDER_ADDITION,
        input=f"Case file: {case_file}\\nLast 3: {last_3_exchanges}\\nLatest: {user_message}",
        model="your main conversational model",
    )

    return responder_output, case_file
"""


def get_client() -> OpenAI:
    return OpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL, timeout=25.0)


LANGUAGE_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
}


def _build_language_lock(language: str, language_prompt: str) -> str:
    """Return the final, highest-priority language instruction block."""
    lang_name = LANGUAGE_NAMES.get(language, "English")

    if language == "en-IN":
        return (
            f"LANGUAGE - ABSOLUTE RULE:\n"
            f"Respond in {lang_name} ONLY.\n"
            f"Do not use any word, phrase, or sentence from Hindi, Tamil, Telugu, or any other language.\n"
            f"Do not mix languages. Do not add Indian-language words as flavor or style.\n"
            f"Pure {lang_name} from start to finish. Any deviation is a failure."
        )
    else:
        return (
            f"LANGUAGE - ABSOLUTE RULE:\n"
            f"{language_prompt}\n"
            f"Respond in {lang_name} ONLY.\n"
            f"Regardless of what language appears in the conversation history, respond only in {lang_name}.\n"
            f"Do not mix in English unless it is a technical word with no natural equivalent.\n"
            f"Responding in the wrong language is a critical failure."
        )


def chat_with_maitri(
    messages: list[dict],
    language: str = "en-IN",
    rag_context: str = "",
    case_file: dict = None,
    language_prompt: str = "",
    max_tokens: int = 250,
    reasoning_effort: str | None = None,
    is_crisis: bool = False,
    exercise_phase: str = "idle",
) -> str:
    # Crisis short-circuit - never reaches LLM
    if is_crisis:
        return (
            "Hey... I am right here with you. You are not alone in this moment. "
            "I really want you to talk to someone who can help properly too. "
            "iCall is 9152987821, they are there 24/7 and they actually care. "
            "Just breathe for a second. What you are feeling right now is temporary, "
            "even if it does not feel like it."
        )

    system_parts = [THERAPY_SYSTEM_PROMPT]

    # Exercise phase tone
    if exercise_phase == "in_progress":
        system_parts.append(
            "[EXERCISE IN PROGRESS] Guide the user through the current exercise step. "
            "Stay calm, slow, grounding. Speak like a friend sitting next to them, not a clinical instructor. "
            "If the user goes off-topic, acknowledge it briefly then gently return to the exercise. "
            "Do not abandon the exercise on the first distraction."
        )
    elif exercise_phase == "awaiting_feedback":
        system_parts.append(
            "[EXERCISE COMPLETE] The exercise is done. Ask warmly how it felt. "
            "Be genuinely curious. Then naturally return to the conversation."
        )

    # MAITRI AGENT LOOP v2 - Case file context
    if case_file:
        import json
        system_parts.append(
            f"[CRITICAL INSTRUCTION FROM DIALOGUE MANAGER]\n"
            f"Case File:\n{json.dumps(case_file, indent=2)}\n"
            "YOU MUST STRICTLY FOLLOW THE DECISION IN THE CASE FILE:\n"
            "- If decision is 'ASK':\n"
            "  1. If `recommended_question` is present in the Case File, use it as your primary inspiration. Adapt its phrasing to sound naturally empathetic.\n"
            "  2. Otherwise, find ONE thing that is still fuzzy and ask a short, gentle question about it.\n"
            "  3. Only ONE question mark allowed in your entire response.\n"
            "- If decision is 'RESPOND':\n"
            "  1. Acknowledge and validate the user's emotion or statement.\n"
            "  2. DO NOT ASK ANY QUESTIONS. Zero question marks allowed.\n"
            "- If decision is 'GROUND':\n"
            "  1. Offer a very brief, gentle grounding exercise (e.g. taking a breath together)."
        )

    # RAG context
    if rag_context:
        system_parts.append(f"RELEVANT THERAPEUTIC KNOWLEDGE (use naturally, do not quote):\n{rag_context}")

    # Language lock - always absolutely last
    system_parts.append(_build_language_lock(language, language_prompt))

    system = "\n\n".join(system_parts)

    active_prompt = ""
    past_history: list[dict] = []
    if messages:
        active_prompt = messages[-1]["content"]
        past_history = messages[:-1]

    api_messages: list[dict] = [{"role": "system", "content": system}]
    for msg in past_history[-20:]:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
    api_messages.append({"role": "user", "content": active_prompt})

    client = get_client()
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=api_messages,
            max_tokens=max_tokens,
            temperature=0.75,
            stream=True,
        )
        full_text = []
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                full_text.append(chunk.choices[0].delta.content)
        result = "".join(full_text).strip()
        return result if result else "I am right here with you. How are you holding up?"
    except Exception as e:
        print(f"Maitri LLM Error: {e}")
        return "I am here with you. Take your time."
