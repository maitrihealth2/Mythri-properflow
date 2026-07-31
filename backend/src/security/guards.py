from fastapi import Request, HTTPException, Depends
from typing import List, Optional
import time

from src.security.rbac import get_current_user, RoleChecker
from src.database.models import User

# --- MOCK CACHE/REDIS FOR RATE LIMITING & SESSION INACTIVITY ---
# In production, replace this with a real Redis connection pool
class SecurityStore:
    # Rate limits: { "ip": [timestamp1, timestamp2] }
    RATE_LIMITS = {}

# ==========================================
# LAYER 2: TRAFFIC CONTROL (RATE LIMITING)
# ==========================================
async def rate_limit_guard(request: Request):
    """
    Distributed Redis-backed rate-limiting logic.
    Blocks automated brute-force attacks by tracking IP/Client velocity.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up old requests (1 minute window)
    window_start = now - 60
    history = SecurityStore.RATE_LIMITS.get(client_ip, [])
    history = [t for t in history if t > window_start]
    
    # Limit: 100 requests per minute
    if len(history) >= 100:
        raise HTTPException(
            status_code=429,
            detail="Too Many Requests. Brute-force protection activated."
        )
        
    history.append(now)
    SecurityStore.RATE_LIMITS[client_ip] = history

# ==========================================
# COMPILED LIFECYCLE PIPELINE DEPENDENCY
# ==========================================
def EnterpriseGuard(roles: Optional[List[str]] = None):
    """
    Comprehensive unified guard for enterprise endpoints.
    Sequentially processes Layer 2 (Rate Limiting) -> Layer 4 (Token Validation & User Fetch) -> Layer 5 (RBAC).
    
    Usage:
    @app.get("/secure-data", dependencies=[Depends(EnterpriseGuard(roles=["manager"]))])
    """
    dependencies = [Depends(rate_limit_guard)]
    if roles:
        dependencies.append(Depends(RoleChecker(allowed_roles=roles)))
    else:
        dependencies.append(Depends(get_current_user))
    
    return dependencies
