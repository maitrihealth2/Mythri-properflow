"""
Auth utilities â€” uses bcrypt directly (no passlib) to avoid version conflicts
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

SECRET_KEY = os.getenv("SECRET_KEY", "changethis_dev_secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
ISSUER = "mindbridge-auth"
AUDIENCE = "mindbridge-users"

def hash_password(password: str) -> str:
    """Hashes a password using enterprise-grade Argon2id"""
    return argon2.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Verifies an Argon2id hash. Fallback to bcrypt if needed (omitted for brevity, assume pure argon in new setup)"""
    try:
        return argon2.verify(plain, hashed)
    except Exception:
        # Fallback to bcrypt if it's an old hash (if they ever used it)
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

def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload.update({
        "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": now,
        "nbf": now,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str, expected_type: str = "access") -> dict | None:
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            audience=AUDIENCE
        )
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None
