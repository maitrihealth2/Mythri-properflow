import os
import sys
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database.models import User, Session as DBSession, Message, MessageEmotion, SessionLocal

def test_db_operations():
    db = SessionLocal()
    try:
        # 1. Get or create a test user
        user = db.query(User).first()
        if not user:
            print("No users found. Creating a test user...")
            user = User(username="testuser", email="test@example.com", password_hash="hash")
            db.add(user)
            db.commit()
            db.refresh(user)
        print(f"Using user: {user.id}")

        # 2. Test Session Creation
        session_token = str(uuid.uuid4())
        print(f"Testing Session Creation (token: {session_token})...")
        new_session = DBSession(
            user_id=user.id,
            session_token=session_token,
            channel="web",
            summary="Test summary",
            cognitive_summary="Test cognitive summary",
            emotional_summary="Test emotional summary",
            engagement_score=0.9,
            risk_score=0.1
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        print(f"[v] Session created successfully! ID: {new_session.id}")

        # 3. Test Message Saving
        print("Testing Message Saving...")
        msg = Message(
            session_id=new_session.id,
            role="user",
            content="Hello world",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        print(f"[v] Message created successfully! ID: {msg.id}")

        # 4. Test MessageEmotion Saving
        print("Testing MessageEmotion Saving...")
        emotion = MessageEmotion(
            message_id=msg.id,
            emotion_label="joy",
            score=0.95
        )
        db.add(emotion)
        db.commit()
        print(f"[v] MessageEmotion created successfully!")

        # 5. Test Session Read with Relationships
        print("Testing Session Retrieval with Relationships...")
        retrieved = db.query(DBSession).filter(DBSession.id == new_session.id).first()
        print(f"[v] Retrieved Session ID: {retrieved.id}")
        print(f"[v] Retrieved Session Summary: {retrieved.summary}")
        print(f"[v] Retrieved Messages Count: {len(retrieved.messages)}")
        for m in retrieved.messages:
            print(f"    - Msg {m.id} [{m.role}]: {m.content}")
            if m.emotion:
                print(f"      - Emotion: {m.emotion.emotion_label} ({m.emotion.score})")

        print("\nALL VERIFICATIONS PASSED!")

    except Exception as e:
        print(f"\n[X] VERIFICATION FAILED: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_db_operations()
