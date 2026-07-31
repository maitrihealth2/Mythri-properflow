from fastapi import Depends, HTTPException
from typing import List, Callable
from src.database.models import User
from src.database.connection import get_db
from src.security.tokens import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db = Depends(get_db)) -> User:
    """
    Validates token and fetches the current user from the database.
    """
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session payload.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deleted.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive.")
        
    return user

def RoleChecker(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control Dependency.
    Checks if the user has the required roles.
    Currently assumes a 'roles' attribute on user or defaults to allowing if 'admin'.
    """
    def enforce_role(user: User = Depends(get_current_user)):
        # For this prototype, assume all normal users are 'user'
        # In a real system, you might have a roles table or column.
        user_roles = getattr(user, "roles", ["user"])
        
        if "admin" in user_roles:
            return user
            
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(status_code=403, detail="Insufficient permissions for this operation.")
        return user
        
    return enforce_role
