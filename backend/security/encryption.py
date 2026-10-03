"""
Field-Level Encryption (FLE) for Sensitive Data (CRIT/HIGH Finding Remediation)
Uses AES-256-GCM authenticated encryption with unique nonces, versioned envelopes,
and automated dual-version key rotation support.
"""
import os
import base64
import secrets
from typing import Optional, Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from sqlalchemy.types import TypeDecorator, Text, String

_KEY_CACHE: Dict[str, bytes] = {}

def _derive_key(secret_str: str, salt: bytes, info: bytes) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=info,
    )
    return hkdf.derive(secret_str.encode("utf-8"))


def get_encryption_key(version: str = "v1") -> bytes:
    """
    Retrieves or derives the 256-bit encryption key for a given envelope version.
    Supports versioned key rotation (v1, v2, etc.).
    """
    global _KEY_CACHE
    if version in _KEY_CACHE:
        return _KEY_CACHE[version]

    # Check for version-specific key in environment (e.g. FIELD_ENCRYPTION_KEY_V2)
    env_var_name = f"FIELD_ENCRYPTION_KEY_{version.upper()}" if version != "v1" else "FIELD_ENCRYPTION_KEY"
    raw_env_key = os.getenv(env_var_name)

    if raw_env_key:
        try:
            if len(raw_env_key) == 64:
                _KEY_CACHE[version] = bytes.fromhex(raw_env_key)
                return _KEY_CACHE[version]
            decoded = base64.b64decode(raw_env_key)
            if len(decoded) == 32:
                _KEY_CACHE[version] = decoded
                return _KEY_CACHE[version]
        except Exception:
            pass

    # Deterministic HKDF derivation from SECRET_KEY with version-specific salt/info
    from security.authentication.service import SECRET_KEY
    salt = f"mythri-fle-salt-{version}".encode("utf-8")
    info = f"mythri-field-level-encryption-{version}".encode("utf-8")
    _KEY_CACHE[version] = _derive_key(SECRET_KEY, salt, info)
    return _KEY_CACHE[version]


def encrypt_field(plaintext: Optional[str], version: str = "v1") -> Optional[str]:
    """
    Encrypts a plaintext string using AES-256-GCM.
    Returns: 'enc:<version>:<base64(nonce_12b + ciphertext_tag)>'
    """
    if plaintext is None or plaintext == "":
        return plaintext

    # If already encrypted with the requested version, don't double-encrypt
    if isinstance(plaintext, str) and plaintext.startswith(f"enc:{version}:"):
        return plaintext

    key = get_encryption_key(version)
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)  # Standard 96-bit nonce for AES-GCM
    data = plaintext.encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, data, None)

    packed = nonce + ciphertext
    encoded = base64.b64encode(packed).decode("ascii")
    return f"enc:{version}:{encoded}"


def decrypt_field(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypts an AES-256-GCM envelope string supporting multiple key versions.
    Gracefully handles unencrypted legacy records by returning them as-is.
    """
    if ciphertext is None or ciphertext == "":
        return ciphertext

    if not isinstance(ciphertext, str) or not ciphertext.startswith("enc:"):
        # Legacy or plaintext record — return as is
        return ciphertext

    try:
        parts = ciphertext.split(":", 2)
        if len(parts) != 3:
            return ciphertext

        version = parts[1]
        encoded = parts[2]
        packed = base64.b64decode(encoded)
        if len(packed) < 28:  # 12b nonce + 16b tag min
            return ciphertext

        nonce = packed[:12]
        ct = packed[12:]
        key = get_encryption_key(version)
        aesgcm = AESGCM(key)
        decrypted = aesgcm.decrypt(nonce, ct, None)
        return decrypted.decode("utf-8")
    except Exception as e:
        print(f"[FLE_DECRYPT_ERROR] Could not decrypt field: {e}")
        return "[ENCRYPTED_DATA_UNAVAILABLE]"


def reencrypt_field(ciphertext: Optional[str], target_version: str = "v2") -> Optional[str]:
    """
    Re-encrypts a ciphertext from its current key version to target_version.
    Used for automated key rotation batches.
    """
    if not ciphertext or not isinstance(ciphertext, str) or not ciphertext.startswith("enc:"):
        return ciphertext
    plaintext = decrypt_field(ciphertext)
    if plaintext and plaintext != "[ENCRYPTED_DATA_UNAVAILABLE]":
        return encrypt_field(plaintext, version=target_version)
    return ciphertext


class EncryptedText(TypeDecorator):
    """
    SQLAlchemy column type for transparent Field-Level Encryption on Text fields.
    Encrypts on write (bind param) and decrypts on read (result value).
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_field(str(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_field(value)
        return value


class EncryptedString(TypeDecorator):
    """
    SQLAlchemy column type for transparent Field-Level Encryption on String fields.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_field(str(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_field(value)
        return value

