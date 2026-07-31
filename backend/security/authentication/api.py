from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database.models import get_db, User
from security.authentication.service import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer()


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    preferred_language: str = "en-IN"


class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    idToken: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    from providers.firebase.firebase_rest import firebase_client
    await firebase_client.register(req.email, req.password)
    
    user = User(
        username=req.username, email=req.email,
        hashed_password="firebase_managed",
        preferred_language=req.preferred_language,
    )
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token({"user_id": user.id, "username": user.username})
    return TokenResponse(access_token=token, username=user.username)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    from providers.firebase.firebase_rest import firebase_client
    await firebase_client.login(req.email, req.password)
    
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token({"user_id": user.id, "username": user.username})
    return TokenResponse(access_token=token, username=user.username)


@router.post("/google", response_model=TokenResponse)
async def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    from providers.firebase.firebase_rest import FIREBASE_API_KEY
    import httpx
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}"
    payload = {"idToken": req.idToken}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        data = response.json()
        
        if not response.is_success or "users" not in data or len(data["users"]) == 0:
            raise HTTPException(status_code=401, detail="Invalid Google token")
            
        google_user = data["users"][0]
        email = google_user.get("email")
        display_name = google_user.get("displayName", "User")
        
        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email")
            
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            base_username = display_name.replace(" ", "").lower()
            if not base_username:
                base_username = email.split("@")[0]
            
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=email,
                hashed_password="firebase_google_managed",
                preferred_language="en-IN"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        token = create_access_token({"user_id": user.id, "username": user.username})
        return TokenResponse(access_token=token, username=user.username)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email, "preferred_language": current_user.preferred_language}