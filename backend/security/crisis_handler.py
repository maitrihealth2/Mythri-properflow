"""
Crisis Safety System — Layer 1: keywords, Layer 2: regex patterns
English + Hindi + Hinglish
"""
import re
from dataclasses import dataclass, field

CRISIS_KEYWORDS = [
    # English
    "want to die","kill myself","end my life","suicide","suicidal",
    "cannot go on","don't want to live","do not want to live",
    "end it all", "ending it all", "no reason to live", "hurt myself",
    "self harm","self-harm","cut myself","overdose","no point living",
    "want to disappear forever","take my own life",
    "don't want this life","do not want this life","don't want to live this life",
    "too heavy to live","life is too heavy","no point in life",
    "nothing matters anymore", "give up on life",
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
    
    # "Better off dead" only if self-referential
    r"(i.?m|i am|i would be|i'd be|id be).{0,10}better off dead",
    
    # "Tired of living" but not followed by "in"
    r"tired of living\b(?!\s*in)",
    
    # "World without me" or "everyone happier if I was gone", any order
    r"(better|happier|easier).{0,20}(world without me|if i was gone|if i were gone)",
    r"(world without me|if i was gone|if i were gone).{0,20}(better|happier|easier)",
    
    # "Can't take it" removed to prevent false positives like "can't take this traffic".
    # Focus on "can't go on" for living
    r"(can.?t|cannot|won.?t).{0,20}(go on living|continue living)",
    
    # "End the pain"
    r"(make|want).{0,20}(the pain|it all).{0,20}(stop|end).{0,20}(forever)",
    
    # New False Negatives:
    r"(take|swallow|have).{0,20}(pills|bottle).{0,20}(tonight|now|end it|take them all)",
    r"(go to sleep|fall asleep).{0,20}never wake up",
    r"jump off.{0,20}(bridge|building|roof)",
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