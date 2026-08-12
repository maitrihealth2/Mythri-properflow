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
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN full_name VARCHAR(100);"))
        conn.commit()
    print("Successfully added full_name to user_profiles table.")
except Exception as e:
    print(f"Note/Error adding full_name: {e}")

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN profession VARCHAR(100);"))
        conn.commit()
    print("Successfully added profession to user_profiles table.")
except Exception as e:
    print(f"Note/Error adding profession: {e}")
