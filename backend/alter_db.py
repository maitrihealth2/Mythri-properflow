import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local", override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mindbridge.db")

print(f"Connecting to {DATABASE_URL.split('@')[-1]}...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE user_onboarding ADD COLUMN raw_responses JSON;"))
        conn.commit()
    print("Successfully added raw_responses JSON column to user_onboarding table.")
except Exception as e:
    print(f"Note/Error: {e}")
