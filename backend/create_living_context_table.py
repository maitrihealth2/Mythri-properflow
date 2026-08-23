import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
import pathlib

_BASE = pathlib.Path(__file__).resolve().parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

# Important: we must import Base and all models so SQLAlchemy knows what to create
from core.database.models import Base, engine, LivingUserContext

print("Creating LivingUserContext table if it doesn't exist...")
LivingUserContext.__table__.create(engine, checkfirst=True)
print("Done!")
