"""
Crisis Safety System — Layer 1: keywords, Layer 2: regex patterns
English + Hindi + Hinglish
"""
import re
from dataclasses import dataclass, field

CRISIS_KEYWORDS = [
    # English
    "want to die","kill myself","end my life","suicide","suicidal",
    "can't go on","cannot go on","don't want to live","do not want to live",
    "end it all","no reason to live","better off dead","hurt myself",
    "self harm","self-harm","cut myself","overdose","no point living",
    "want to disappear forever","take my own life",
    "don't want this life","do not want this life","don't want to live this life",
    "too heavy to live","life is too heavy","no point in life",
    "nothing matters anymore", "give up on life", "tired of living",
    "wish i was never born", "wish i weren't alive",
    "no way out", "makes no difference if i die",
    # Hindi romanized
    "marna chahta","marna chahti","jeena nahi","zindagi khatam",
    "khud ko hurt","khatam kar lun","khatam kar loon","maut chahiye",
    "mar jaana","mar jana chahta","zindagi bojh","zindagi nahi chahiye",
    "thak gaya hoon zindagi se", "kuch nahi bacha", "koi fayda nahi",
    # Hindi devanagari
    "मरना चाहता","मरना चाहती","जीना नहीं","ज़िंदगी ख़त्म",
    "खुद को नुकसान","ख़त्म कर लूं","मौत चाहिए",
    "जिंदगी से हार", "कोई उम्मीद नहीं"
]

CRISIS_PATTERNS = [
    r"(want|wish|hope).{0,20}(die|dead|death|disappear)",
    r"(thinking|thought|thoughts).{0,20}(suicide|killing myself|ending it|harming)",
    r"(no|don.?t).{0,20}(reason|point|purpose).{0,20}(live|living|life)",
    r"(better|world|everyone).{0,20}(without me|if i was gone|if i were gone)",
    r"(can.?t|cannot|won.?t).{0,20}(take it|handle|go on|continue|do this anymore)",
    r"(make|want).{0,20}(the pain|it all).{0,20}(stop|end).{0,20}(forever)",
]

CRISIS_RESPONSE = "I am so deeply sorry you are feeling this way, but please know you are not alone right now. Your life is valuable, and there is help available immediately. Please reach out to these emergency services — they are free, confidential, and run by people who care:"

HELPLINES = [
    "iCall: 9152987821 (24/7)",
]


@dataclass
class CrisisCheckResult:
    is_crisis: bool
    trigger_phrase: str | None = None
    response: str | None = None
    helplines: list[str] = field(default_factory=list)


def check_for_crisis(text: str) -> CrisisCheckResult:
    lower = text.lower().strip()
    for kw in CRISIS_KEYWORDS:
        if kw.lower() in lower:
            return CrisisCheckResult(True, kw, CRISIS_RESPONSE, HELPLINES)
    for pattern in CRISIS_PATTERNS:
        m = re.search(pattern, lower, re.IGNORECASE)
        if m:
            return CrisisCheckResult(True, m.group(0), CRISIS_RESPONSE, HELPLINES)
    return CrisisCheckResult(False)