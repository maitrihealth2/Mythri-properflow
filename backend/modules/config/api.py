from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database.models import get_db, AppConfiguration

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/theme")
def get_global_theme(db: Session = Depends(get_db)):
    # Fetch the global theme from DB
    config_entry = db.query(AppConfiguration).filter(AppConfiguration.config_key == "global_theme").first()
    
    if config_entry:
        return {"theme": config_entry.config_value}
    
    # Default to mythri if not found
    return {"theme": "mythri"}
