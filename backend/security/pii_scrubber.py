"""
PII Scrubbing and Data Minimization Engine
Safeguards user privacy by redacting identifying information (phone, email, Aadhaar, PAN, payment details)
prior to passing context to third-party AI APIs (Sarvam AI, OpenAI, etc.).
"""
import re
from typing import Tuple, Dict, Any

# ── Compiled Regular Expressions for Common PII ──────────────────────────────

# 1. Emails
EMAIL_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
)

# 2. Indian & International Phone Numbers:
# Supports +91, 0 prefix, 10-digit mobile starting with 6-9, standard hyphen/space formatting
PHONE_REGEX = re.compile(
    r'(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b|'
    r'\b(?:\+1[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4}\b'
)

# 3. Aadhaar Number (12 digits, often in 4-4-4 format)
AADHAAR_REGEX = re.compile(
    r'\b[2-9]\d{3}[\s\-]\d{4}[\s\-]\d{4}\b'
)

# 4. PAN Card (5 uppercase letters, 4 digits, 1 uppercase letter)
PAN_REGEX = re.compile(
    r'\b[A-Z]{5}[0-9]{4}[A-Z]\b'
)

# 5. Payment Cards (13 to 19 digits with optional spaces or dashes)
CARD_REGEX = re.compile(
    r'\b(?:\d{4}[\s\-]?){3}\d{1,4}\b'
)

# 6. IPv4 Addresses
IP_REGEX = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
)

# ── Redaction Engine ─────────────────────────────────────────────────────────

def scrub_pii(text: str) -> Tuple[str, Dict[str, int]]:
    """
    Scans and redacts PII entities from text.
    Returns:
        (scrubbed_text, stats_dict)
    """
    if not text or not isinstance(text, str):
        return text, {}

    stats: Dict[str, int] = {}
    scrubbed = text

    # Redact Emails
    emails = EMAIL_REGEX.findall(scrubbed)
    if emails:
        stats["email"] = len(emails)
        scrubbed = EMAIL_REGEX.sub("[EMAIL_REDACTED]", scrubbed)

    # Redact Aadhaar before phone to avoid sub-matching
    aadhaar_matches = AADHAAR_REGEX.findall(scrubbed)
    if aadhaar_matches:
        stats["aadhaar"] = len(aadhaar_matches)
        scrubbed = AADHAAR_REGEX.sub("[GOVT_ID_REDACTED]", scrubbed)

    # Redact PAN
    pan_matches = PAN_REGEX.findall(scrubbed)
    if pan_matches:
        stats["pan"] = len(pan_matches)
        scrubbed = PAN_REGEX.sub("[TAX_ID_REDACTED]", scrubbed)

    # Redact Phone Numbers
    phone_matches = PHONE_REGEX.findall(scrubbed)
    if phone_matches:
        stats["phone"] = len(phone_matches)
        scrubbed = PHONE_REGEX.sub("[PHONE_REDACTED]", scrubbed)

    # Redact Payment Cards
    card_matches = [c for c in CARD_REGEX.findall(scrubbed) if len(c.replace(" ", "").replace("-", "")) >= 13]
    if card_matches:
        stats["card"] = len(card_matches)
        for card in card_matches:
            scrubbed = scrubbed.replace(card, "[CARD_REDACTED]")

    # Redact IPs (avoid localhost / standard private IPs if intended, but redact external IPs)
    ip_matches = [ip for ip in IP_REGEX.findall(scrubbed) if not ip.startswith(("127.", "0.0.0.0"))]
    if ip_matches:
        stats["ip"] = len(ip_matches)
        for ip in ip_matches:
            scrubbed = scrubbed.replace(ip, "[IP_REDACTED]")

    return scrubbed, stats


def contains_sensitive_pii(text: str) -> bool:
    """Returns True if the text contains any detectable high-sensitivity PII."""
    if not text:
        return False
    return bool(
        EMAIL_REGEX.search(text) or
        PHONE_REGEX.search(text) or
        AADHAAR_REGEX.search(text) or
        PAN_REGEX.search(text) or
        CARD_REGEX.search(text)
    )
