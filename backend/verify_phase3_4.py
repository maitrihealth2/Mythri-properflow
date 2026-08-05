import asyncio
import httpx
import uuid
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from datetime import datetime
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database.models import Base, User, UserOnboarding, Session as DBSession, Message, SessionLocal

API_URL = "http://127.0.0.1:8000"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_users(db):
    # Ensure User 1 (First Time User)
    user1 = db.query(User).filter(User.email == "user1@example.com").first()
    if not user1:
        user1 = User(username="UserOne", email="user1@example.com", hashed_password="hashed_password", is_active=True)
        db.add(user1)
        db.commit()
        db.refresh(user1)
    
    onboarding1 = db.query(UserOnboarding).filter(UserOnboarding.user_id == user1.id).first()
    if not onboarding1:
        onboarding1 = UserOnboarding(
            user_id=user1.id,
            preferred_name="Alice",
            primary_goal="I want to reduce anxiety at work.",
            goals=["Stress Management"],
            reasons=["Work pressure"],
            is_completed=True
        )
        db.add(onboarding1)
        db.commit()

    # Clear previous sessions for User 1 to ensure Mode 1 (First Time User)
    db.query(Message).filter(Message.session_id.in_(db.query(DBSession.id).filter(DBSession.user_id == user1.id))).delete(synchronize_session=False)
    db.query(DBSession).filter(DBSession.user_id == user1.id).delete(synchronize_session=False)
    db.commit()


    # Ensure User 2 (Returning User)
    user2 = db.query(User).filter(User.email == "user2@example.com").first()
    if not user2:
        user2 = User(username="UserTwo", email="user2@example.com", hashed_password="hashed_password", is_active=True)
        db.add(user2)
        db.commit()
        db.refresh(user2)
        
    onboarding2 = db.query(UserOnboarding).filter(UserOnboarding.user_id == user2.id).first()
    if not onboarding2:
        onboarding2 = UserOnboarding(
            user_id=user2.id,
            preferred_name="Bob",
            primary_goal="Improve my sleep quality.",
            is_completed=True
        )
        db.add(onboarding2)
        db.commit()

    # Ensure User 2 has at least one previous session to trigger Mode 2 (Returning User)
    session_count2 = db.query(DBSession).filter(DBSession.user_id == user2.id).count()
    if session_count2 == 0:
        past_session = DBSession(user_id=user2.id, session_token="past_token_bob")
        db.add(past_session)
        db.commit()

    return user1, user2

def get_token(client, email):
    res = client.post(f"{API_URL}/api/auth/login", json={"email": email, "password": "password123"})
    # Assuming password123 isn't actually checked properly in test accounts or they are created differently.
    # Alternatively, we can forge a token if we know the secret, or bypass.
    # Since we don't have the password, we will just use a mock token or login if possible.
    pass

async def simulate():
    print("="*60)
    print(" PHASE 3.4 RUNTIME VERIFICATION SCRIPT")
    print("="*60)
    
    db = next(get_db())
    user1, user2 = setup_users(db)
    
    # Actually, to authenticate against the real API, we need the JWT.
    # Let's import the access token creator.
    from security.authentication.service import create_access_token
    token1 = create_access_token(data={"user_id": str(user1.id)})
    token2 = create_access_token(data={"user_id": str(user2.id)})
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. First Time User
        print("\n[TEST 1] Testing First Time User (Mode 1)")
        t0 = time.time()
        res1 = await client.post(
            f"{API_URL}/api/consultation/start",
            headers={"Authorization": f"Bearer {token1}"}
        )
        t1 = time.time()
        print(f"Status: {res1.status_code}")
        print(f"Body: {res1.text}")
        data1 = res1.json()
        print(f"Time: {t1-t0:.2f}s")
        print(f"Response: {data1.get('message')}")
        assert data1.get("is_first_session") is True
        assert "Alice" in data1.get("message", "")
        print("[OK] Mode 1 passed.")

        # 2. Returning User (New Chat)
        print("\n[TEST 2] Testing Returning User (Mode 2)")
        t0 = time.time()
        res2 = await client.post(
            f"{API_URL}/api/consultation/start",
            headers={"Authorization": f"Bearer {token2}"}
        )
        t1 = time.time()
        data2 = res2.json()
        print(f"Time: {t1-t0:.2f}s")
        print(f"Response: {data2.get('message')}")
        assert data2.get("is_first_session") is False
        assert "Bob" in data2.get("message", "")
        print("[OK] Mode 2 passed.")
        
        # 3. Two consecutive new chats generate different greetings
        print("\n[TEST 3] Testing Greeting Diversity (Consecutive starts for Bob)")
        t0 = time.time()
        res3 = await client.post(
            f"{API_URL}/api/consultation/start",
            headers={"Authorization": f"Bearer {token2}"}
        )
        t1 = time.time()
        data3 = res3.json()
        print(f"Time: {t1-t0:.2f}s")
        print(f"Response 2: {data3.get('message')}")
        assert data2.get("message") != data3.get("message")
        print("[OK] Diversity passed.")
        
        print("\n[OK] All 3.4 functional scenarios verified successfully!")

if __name__ == "__main__":
    asyncio.run(simulate())
