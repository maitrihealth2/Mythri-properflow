"""
Conversation Speech Act & Intent Engine
Redesigning Maitri's reasoning pipeline to be Conversation-First & Memory-Supported.

Priority Hierarchy:
1. Current User Message (50% Weight) - Respond primarily to what the user JUST said.
2. Conversation Context (20% Weight) - Maintain natural dialogue continuity.
3. Relevant Memory (20% Weight) - Only inject when relevant; zero memory dumping.
4. User Profile & Preferences (10% Weight) - Tone & style.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Set


class SpeechAct(str, Enum):
    EXPRESSING_EMOTION = "expressing_emotion"
    ASKING_FOR_ADVICE = "asking_for_advice"
    CONTINUING_STORY = "continuing_story"
    SHARING_INFO = "sharing_info"
    RECALLING_SOMETHING = "recalling_something"
    UPDATING_INFO = "updating_info"
    GENERAL_CHAT = "general_chat"


@dataclass
class ConversationIntentAnalysis:
    speech_act: SpeechAct
    is_memory_needed: bool
    is_explicit_recall: bool
    extracted_entities: List[str] = field(default_factory=list)
    reasoning: str = ""


class ConversationSpeechActEngine:
    """
    Analyzes the user's current message to determine speech act and memory necessity.
    Ensures memory is ONLY retrieved and injected when genuinely needed.
    """

    RECALL_TRIGGERS = [
        "do you remember", "what do you remember", "what do you know about",
        "who is", "who was", "tell me about", "what are my goals",
        "what is my", "what are my", "did i tell you"
    ]

    EMOTION_TRIGGERS = [
        "i feel", "i'm feeling", "i am feeling", "feeling down", "feeling lonely",
        "feeling sad", "feeling anxious", "feeling lost", "feeling overwhelmed",
        "i am sad", "i am lonely", "i'm sad", "i'm lonely", "i'm scared", "i hate this"
    ]

    ADVICE_TRIGGERS = [
        "what should i do", "how do i handle", "how should i deal",
        "give me advice", "what do you suggest", "any tips"
    ]

    def analyze(self, message: str, known_entities: Optional[List[str]] = None) -> ConversationIntentAnalysis:
        msg_clean = message.strip().lower()
        known_entities = known_entities or []

        # 1. Explicit Memory Recall Check
        if any(trig in msg_clean for trig in self.RECALL_TRIGGERS):
            matched_ents = [e for e in known_entities if e.lower() in msg_clean]
            return ConversationIntentAnalysis(
                speech_act=SpeechAct.RECALLING_SOMETHING,
                is_memory_needed=True,
                is_explicit_recall=True,
                extracted_entities=matched_ents,
                reasoning="User explicitly asked for memory recall."
            )

        # 2. Emotional Expression Check
        if any(trig in msg_clean for trig in self.EMOTION_TRIGGERS):
            return ConversationIntentAnalysis(
                speech_act=SpeechAct.EXPRESSING_EMOTION,
                is_memory_needed=False,
                is_explicit_recall=False,
                reasoning="User is expressing current emotional state. Current message 50% priority. Zero memory dump."
            )

        # 3. Advice Request Check
        if any(trig in msg_clean for trig in self.ADVICE_TRIGGERS):
            return ConversationIntentAnalysis(
                speech_act=SpeechAct.ASKING_FOR_ADVICE,
                is_memory_needed=False,
                is_explicit_recall=False,
                reasoning="User is asking for advice. Focus on current message context."
            )

        # 4. Known Entity Continuation or Update Check
        matched_ents = [e for e in known_entities if e.lower() in msg_clean]
        if matched_ents:
            is_update = any(kw in msg_clean for kw in ["got married", "moved to", "started a new", "passed away", "left"])
            act = SpeechAct.UPDATING_INFO if is_update else SpeechAct.CONTINUING_STORY
            return ConversationIntentAnalysis(
                speech_act=act,
                is_memory_needed=True,
                is_explicit_recall=False,
                extracted_entities=matched_ents,
                reasoning=f"User mentioned entity ({', '.join(matched_ents)}). Injecting silent supporting memory."
            )

        # 5. General Sharing / Chat Default
        return ConversationIntentAnalysis(
            speech_act=SpeechAct.SHARING_INFO if len(msg_clean.split()) > 3 else SpeechAct.GENERAL_CHAT,
            is_memory_needed=False,
            is_explicit_recall=False,
            reasoning="General message. No memory injection required."
        )
