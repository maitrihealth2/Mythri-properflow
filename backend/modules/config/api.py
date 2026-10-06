from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database.models import get_db, AppConfiguration

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/feedback_mode")
def get_feedback_mode(db: Session = Depends(get_db)):
    config = db.query(AppConfiguration).filter(AppConfiguration.config_key == "feedback_flow_version").first()
    mode = config.config_value if config else "new"
    return {"feedback_mode": mode, "mode": mode}



