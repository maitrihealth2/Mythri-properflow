import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
tables = inspector.get_table_names()

required_tables = ["message_analysis", "response_metadata", "session_summaries", "sessions"]
for req in required_tables:
    if req in tables:
        print(f"Table '{req}' EXISTS.")
    else:
        print(f"Table '{req}' is MISSING.")
