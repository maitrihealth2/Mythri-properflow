from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from core.database.models import get_db
from modules.admin.api import require_admin
from modules.maintenance.service import (
    get_maintenance_status,
    set_maintenance_mode,
    disable_maintenance_mode
)

router = APIRouter(tags=["maintenance"])

class SetMaintenanceRequest(BaseModel):
    enabled: bool = True
    duration_minutes: Optional[int] = Field(None, ge=1, le=43200) # up to 30 days
    ends_at: Optional[str] = None
    message: Optional[str] = None

# Public endpoint for system status check
@router.get("/api/system/maintenance")
def check_maintenance(db: Session = Depends(get_db)):
    return get_maintenance_status(db)

# Admin endpoints
@router.get("/api/admin/maintenance")
def admin_get_maintenance(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return get_maintenance_status(db)

@router.post("/api/admin/maintenance/set")
def admin_set_maintenance(
    req: SetMaintenanceRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_email = admin.get("email", "admin")
    return set_maintenance_mode(
        db=db,
        enabled=req.enabled,
        duration_minutes=req.duration_minutes,
        ends_at_iso=req.ends_at,
        message=req.message,
        updated_by=admin_email
    )

@router.post("/api/admin/maintenance/disable")
def admin_disable_maintenance(admin=Depends(require_admin), db: Session = Depends(get_db)):
    admin_email = admin.get("email", "admin")
    return disable_maintenance_mode(db=db, updated_by=admin_email)
