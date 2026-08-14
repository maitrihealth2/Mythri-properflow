import os
import pathlib
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import create_engine, inspect

_BASE = pathlib.Path(__file__).resolve().parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found.")
    exit(1)

# fix URL for psycopg2 if it's postgres:// instead of postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to: {db_url}")

engine = create_engine(db_url)
inspector = inspect(engine)

try:
    columns = inspector.get_columns("sessions")
    print("\n--- SESSIONS TABLE SCHEMA ---")
    for col in columns:
        print(f"Name: {col['name']}, Type: {col['type']}, Nullable: {col['nullable']}, Default: {col['default']}")
except Exception as e:
    print(f"Error inspecting table: {e}")
