import time
from typing import Dict, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger("security")

# ---------------------------------------------------------------------------
# Distributed rate limiting NOTE:
# This in-process store is intentionally left for single-worker / dev use.
# Phase 4 will replace this with a Redis-backed distributed limiter.
# Real client IP is now extracted correctly from Cloudflare headers.
# ---------------------------------------------------------------------------
RATE_LIMIT_STORE: Dict[str, Tuple[int, float]] = {}

# Per-minute limits (single-window fixed)
RATE_LIMITS = {
    "auth_login":    10,   # login / register (was 60 — too permissive)
    "admin_login":    5,   # admin login (strict — 5 per 15 min window)
    "auth_general":  20,   # other /auth/* routes
    "default":      100,   # everything else
}
ADMIN_WINDOW   = 15 * 60   # 15-minute window for admin brute-force protection
DEFAULT_WINDOW = 60        # 60-second window for everything else


def _get_real_ip(request: Request) -> str:
    """
    Extract the real client IP in a Cloudflare-proxied environment.
    Priority: CF-Connecting-IP > X-Forwarded-For[0] > request.client.host
    Only trusts these headers because TrustedHostMiddleware is applied first.
    """
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_payload_bytes: int = 10 * 1024 * 1024):
        super().__init__(app)
        self.max_payload_bytes = max_payload_bytes

    async def dispatch(self, request: Request, call_next):
        # 1. Payload size limit
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_payload_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Payload too large. Maximum allowed size is 10MB."}
                    )
            except ValueError:
                pass

        # 2. Rate limiting (process-local; Phase 4 will migrate to Redis)
        if request.method != "OPTIONS":
            client_ip = _get_real_ip(request)
            path = request.url.path
            current_time = time.time()

            # Classify endpoint for rate-limit bucket
            if path == "/api/admin/login":
                limit  = RATE_LIMITS["admin_login"]
                window = ADMIN_WINDOW
                bucket = f"admin|{client_ip}"
            elif path in ("/api/auth/login", "/api/auth/register", "/api/auth/forgot-password"):
                limit  = RATE_LIMITS["auth_login"]
                window = DEFAULT_WINDOW
                bucket = f"auth|{client_ip}"
            elif path.startswith("/api/auth/"):
                limit  = RATE_LIMITS["auth_general"]
                window = DEFAULT_WINDOW
                bucket = f"authgen|{client_ip}"
            else:
                limit  = RATE_LIMITS["default"]
                window = DEFAULT_WINDOW
                bucket = f"default|{client_ip}"

            if bucket in RATE_LIMIT_STORE:
                count, reset_time = RATE_LIMIT_STORE[bucket]
                if current_time > reset_time:
                    RATE_LIMIT_STORE[bucket] = (1, current_time + window)
                elif count >= limit:
                    logger.warning(
                        "rate_limit_exceeded",
                        extra={"ip": client_ip, "path": path, "bucket": bucket}
                    )
                    return JSONResponse(
                        status_code=429,
                        headers={"Retry-After": str(int(reset_time - current_time))},
                        content={"detail": "Too many requests. Please try again later."}
                    )
                else:
                    RATE_LIMIT_STORE[bucket] = (count + 1, reset_time)
            else:
                RATE_LIMIT_STORE[bucket] = (1, current_time + window)

        # 3. Process request
        response = await call_next(request)

        # 4. Security headers — full suite
        h = response.headers

        # Transport
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content sniffing / framing
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"]         = "DENY"

        # Referrer / permissions
        h["Referrer-Policy"]   = "strict-origin-when-cross-origin"
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # Cross-origin isolation policies
        h["Cross-Origin-Opener-Policy"]   = "same-origin"
        h["Cross-Origin-Resource-Policy"] = "same-site"

        # Content-Security-Policy (API server — tighten further on frontend)
        h["Content-Security-Policy"] = (
            "default-src 'none'; "
            "frame-ancestors 'none';"
        )

        # NOTE: X-XSS-Protection intentionally omitted — deprecated; CSP is the modern control

        return response
