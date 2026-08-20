import time
import os
import sys

sys.path.append("d:/Copy/V5(frontend)/backend")

from core.database.models import SessionLocal, User, UserOnboarding, UserPersonaProfile

def reset_onboarding(email="test01@gmail.com"):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # print(f"User {email} not found.")
            return

        changed = False

        onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user.id).first()
        if onboarding and onboarding.is_completed:
            onboarding.is_completed = False
            changed = True
            print(f"Reset onboarding.is_completed for {email}")
            
        persona = db.query(UserPersonaProfile).filter(UserPersonaProfile.user_id == user.id).first()
        if persona and persona.onboarding_complete:
            persona.onboarding_complete = False
            changed = True
            print(f"Reset persona.onboarding_complete for {email}")

        if changed:
            db.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    email = "test01@gmail.com"
    print(f"Starting auto-reset for {email}...")
    while True:
        reset_onboarding(email)
        time.sleep(2)
