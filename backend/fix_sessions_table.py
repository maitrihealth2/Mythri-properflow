import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

columns_to_add = [
    ("summary", "TEXT"),
    ("emotional_summary", "TEXT"),
    ("cognitive_summary", "TEXT"),
    ("behavioral_summary", "TEXT"),
    ("dominant_emotion", "VARCHAR(50)"),
    ("risk_level", "VARCHAR(20)"),
    ("risk_score", "FLOAT"),
    ("conversation_goal", "VARCHAR(100)"),
    ("engagement_score", "FLOAT"),
    ("trust_score", "FLOAT"),
    ("openness_score", "FLOAT"),
    ("message_count", "INTEGER"),
    ("assistant_message_count", "INTEGER"),
    ("user_message_count", "INTEGER"),
    ("session_status", "VARCHAR(20)"),
    ("updated_at", "TIMESTAMP WITH TIME ZONE")
]

try:
    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE sessions ADD COLUMN {col_name} {col_type};"))
                print(f"Added column {col_name}")
            except Exception as e:
                print(f"Note (probably already exists): {col_name} - {e}")
        conn.commit()
    print("Finished adding columns to sessions table.")
except Exception as e:
    print(f"Error connecting/altering: {e}")
