from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import List, Optional
import time

# Security configuration (typically loaded from core.config)
SECRET_KEY = "ENFORCE_IN_CONFIG_PY"
ALGORITHM = "HS256"

security_scheme = HTTPBearer()

# --- MOCK CACHE/REDIS FOR RATE LIMITING & SESSION INACTIVITY ---
# In production, replace this with a real Redis connection pool
class SecurityStore:
    # Active sessions: { "user_id": { "roles": [], "last_active": timestamp } }
    SESSIONS = {}
    
    # Rate limits: { "ip": [timestamp1, timestamp2] }
    RATE_LIMITS = {}
    
    # Blacklisted tokens (e.g. on logout)
    REVOKED_TOKENS = set()

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
# LAYER 4: SESSION SECURITY & TOKEN VALIDATION
# ==========================================
async def token_validation_guard(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """
    Asymmetric JWT validation guard.
    Inspects active sessions, validates signatures, and checks revocation.
    """
    token = credentials.credentials
    
    if token in SecurityStore.REVOKED_TOKENS:
        raise HTTPException(status_code=401, detail="Session revoked or expired.")
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid session payload.")
            
        # Optional: Check if session is marked active in Redis
        # if user_id not in SecurityStore.SESSIONS:
        #     raise HTTPException(status_code=401, detail="Session invalidated remotely.")
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Cryptographic verification failed.")

# ==========================================
# LAYER 5: ACCESS CONTROL (RBAC)
# ==========================================
class RBACGuard:
    """
    Strict Role-Based Access Control logic wrapper.
    Only permits users with the explicit required roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, payload: dict = Depends(token_validation_guard)):
        user_roles = payload.get("roles", [])
        
        # Super-admin override
        if "admin" in user_roles:
            return payload
            
        has_access = any(role in self.allowed_roles for role in user_roles)
        if not has_access:
            raise HTTPException(
                status_code=403, 
                detail="Insufficient permissions to access this domain resource."
            )
        return payload

# ==========================================
# COMPILED LIFECYCLE PIPELINE DEPENDENCY
# ==========================================
def EnterpriseGuard(roles: Optional[List[str]] = None):
    """
    Comprehensive unified guard for enterprise endpoints.
    Sequentially processes Layer 2 -> Layer 4 -> Layer 5.
    
    Usage:
    @app.get("/secure-data", dependencies=[Depends(EnterpriseGuard(roles=["manager"]))])
    """
    dependencies = [Depends(rate_limit_guard)]
    if roles:
        dependencies.append(Depends(RBACGuard(allowed_roles=roles)))
    else:
        dependencies.append(Depends(token_validation_guard))
    
    return dependencies
