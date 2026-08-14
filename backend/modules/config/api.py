from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database.models import get_db, AppConfiguration

router = APIRouter(prefix="/api/config", tags=["config"])


