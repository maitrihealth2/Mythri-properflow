"""
Auth utilities — uses Argon2id for password hashing, PyJWT for tokens.
"""
import os
from datetime import datetime, timedelta, timezone
import uuid
import jwt
from jwt.exceptions import PyJWTError as JWTError
from dotenv import load_dotenv
import pathlib
from passlib.hash import argon2

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

import secrets
import warnings

_RAW_SECRET = os.getenv("SECRET_KEY")
if not _RAW_SECRET or _RAW_SECRET in ("1234", "changethis_dev_secret", "secret", "default_secret"):
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("CRITICAL SECURITY ERROR: Strong SECRET_KEY must be configured in environment variables for production!")
    warnings.warn("[SECURITY WARNING] SECRET_KEY is missing or insecure! Using generated secure secret.")
    SECRET_KEY = _RAW_SECRET if _RAW_SECRET and len(_RAW_SECRET) >= 32 else secrets.token_hex(32)
else:
    SECRET_KEY = _RAW_SECRET

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30          # SHORT-LIVED — intentional; refresh via /auth/refresh
REFRESH_TOKEN_EXPIRE_DAYS = 7
ISSUER = "affynelabs-auth"
AUDIENCE = "affynelabs-users"


def hash_password(password: str) -> str:
    """Hashes a password using enterprise-grade Argon2id"""
    return argon2.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifies an Argon2id hash. Fallback to bcrypt for legacy hashes."""
    try:
        return argon2.verify(plain, hashed)
    except Exception:
        import bcrypt
        try:
            return bcrypt.checkpw(plain[:72].encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False


def create_access_token(data: dict) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload.update({
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
        "nbf": now,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "jti": str(uuid.uuid4()),
        "type": "access"
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, family: str | None = None) -> tuple[str, str, str]:
    """
    Creates a refresh token.
    Returns: (token_string, jti, family)
    'family' links all tokens in the same rotation chain for reuse detection.
    """
    token_jti    = str(uuid.uuid4())
    token_family = family or str(uuid.uuid4())
    now          = datetime.now(timezone.utc)
    payload = data.copy()
    payload.update({
        "exp":    now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat":    now,
        "nbf":    now,
        "iss":    ISSUER,
        "aud":    AUDIENCE,
        "jti":    token_jti,
        "family": token_family,
        "type":   "refresh"
    })
    token_str = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token_str, token_jti, token_family


def decode_token(token: str, expected_type: str = "access") -> dict | None:
    """
    Validates a JWT using native PyJWT issuer + audience enforcement.
    verify_aud / verify_iss are NOT disabled — the library enforces them.
    Legacy 'mindbridge-auth' issuer is intentionally no longer accepted.
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            audience=AUDIENCE,
        )
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Server-side refresh token store  (DB-backed, Phase 2 — CRIT-02)
# ---------------------------------------------------------------------------

def store_refresh_token(db, user_id: int, jti: str, family: str) -> None:
    """Persists a new refresh token JTI to the DB."""
    from core.database.models import RefreshToken
    now = datetime.now(timezone.utc)
    record = RefreshToken(
        jti=jti,
        family=family,
        user_id=user_id,
        issued_at=now,
        expires_at=now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(record)
    db.commit()


def verify_and_rotate_refresh_token(db, token: str) -> tuple[dict, str] | tuple[None, None]:
    """
    Validates a refresh token against the server-side DB store.

    Returns: (payload, family)  on success — caller must store new JTI immediately
             (None, None)       on any failure

    REUSE DETECTION: if the incoming JTI is already marked revoked (consumed),
    the entire token family is immediately revoked — token theft is assumed.
    The user will need to log in again.
    """
    from core.database.models import RefreshToken

    payload = decode_token(token, expected_type="refresh")
    if not payload:
        return None, None

    jti    = payload.get("jti")
    family = payload.get("family")

    if not jti or not family:
        return None, None

    record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()

    if not record:
        # JTI not in DB — orphaned token (old pre-Phase-2 token or forged)
        return None, None

    if record.revoked:
        # ── REUSE DETECTED — revoke the entire family ──
        now = datetime.now(timezone.utc)
        db.query(RefreshToken).filter(
            RefreshToken.family == family,
            RefreshToken.revoked == False  # noqa: E712
        ).update({
            "revoked": True,
            "revoked_at": now,
            "revoke_reason": "reuse_detected"
        })
        db.commit()
        return None, None

    # Valid — mark this JTI as consumed (rotated)
    now = datetime.now(timezone.utc)
    record.revoked       = True
    record.revoked_at    = now
    record.revoke_reason = "rotated"
    db.commit()

    return payload, family


def revoke_refresh_token_by_jti(db, jti: str, reason: str = "logout") -> bool:
    """Revokes a single refresh token by JTI. Returns True if found and revoked."""
    from core.database.models import RefreshToken
    record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if record and not record.revoked:
        record.revoked       = True
        record.revoked_at    = datetime.now(timezone.utc)
        record.revoke_reason = reason
        db.commit()
        return True
    return False


# ---------------------------------------------------------------------------
# Multi-Factor Authentication (RFC 6238 TOTP) & Step-Up Auth Helpers
# ---------------------------------------------------------------------------

import hmac
import hashlib
import struct
import base64

def generate_totp_secret() -> str:
    """Generates a standard 160-bit base32 encoded TOTP secret for Google Authenticator / Passkeys."""
    random_bytes = secrets.token_bytes(20)
    return base64.b32encode(random_bytes).decode("ascii").rstrip("=")


def get_totp_token(secret_b32: str, intervals_no: int | None = None) -> str:
    """Calculates a 6-digit TOTP code for a given base32 secret and time interval."""
    if intervals_no is None:
        intervals_no = int(datetime.now(timezone.utc).timestamp()) // 30

    # Normalize base32 padding
    padding = "=" * ((8 - len(secret_b32) % 8) % 8)
    key = base64.b32decode(secret_b32.upper() + padding)
    msg = struct.pack(">Q", intervals_no)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    o = h[19] & 15
    h_int = struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff
    code = str(h_int % 1000000).zfill(6)
    return code


def verify_totp_code(secret_b32: str, code: str, window: int = 1) -> bool:
    """
    Verifies a 6-digit TOTP code against a user's base32 secret.
    Allows a 30s clock skew window (window=1 checks current, previous, and next interval).
    """
    if not secret_b32 or not code or len(code.strip()) != 6:
        return False

    code = code.strip()
    current_interval = int(datetime.now(timezone.utc).timestamp()) // 30

    for offset in range(-window, window + 1):
        if get_totp_token(secret_b32, current_interval + offset) == code:
            return True
    return False

