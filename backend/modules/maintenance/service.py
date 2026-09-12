from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from core.database.models import SystemMaintenance

def get_or_create_maintenance_record(db: Session) -> SystemMaintenance:
    record = db.query(SystemMaintenance).order_by(SystemMaintenance.id.asc()).first()
    if not record:
        record = SystemMaintenance(
            is_enabled=False,
            message="We are performing scheduled maintenance to improve your experience. Mythri will be back shortly.",
            ends_at=None,
            started_at=None,
            updated_by="system"
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    return record

def get_maintenance_status(db: Session) -> Dict[str, Any]:
    record = get_or_create_maintenance_record(db)
    now = datetime.now(timezone.utc)
    
    # Check if timer has expired
    if record.is_enabled and record.ends_at:
        # Normalize timezone if needed
        ends_at = record.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
            
        if now >= ends_at:
            record.is_enabled = False
            db.commit()
            db.refresh(record)

    remaining_seconds = 0
    if record.is_enabled and record.ends_at:
        ends_at = record.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        diff = (ends_at - now).total_seconds()
        remaining_seconds = max(0, int(diff))

    return {
        "enabled": bool(record.is_enabled),
        "message": record.message or "We are performing scheduled maintenance to improve your experience. Mythri will be back shortly.",
        "ends_at": record.ends_at.isoformat() if record.ends_at else None,
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "remaining_seconds": remaining_seconds,
        "server_time": now.isoformat(),
        "updated_by": record.updated_by
    }

def set_maintenance_mode(
    db: Session,
    enabled: bool,
    duration_minutes: Optional[int] = None,
    ends_at_iso: Optional[str] = None,
    message: Optional[str] = None,
    updated_by: str = "admin"
) -> Dict[str, Any]:
    record = get_or_create_maintenance_record(db)
    now = datetime.now(timezone.utc)
    
    record.is_enabled = enabled
    record.updated_by = updated_by
    if message is not None:
        record.message = message.strip() or "We are performing scheduled maintenance to improve your experience. Mythri will be back shortly."
    
    if enabled:
        record.started_at = now
        if duration_minutes and duration_minutes > 0:
            record.ends_at = now + timedelta(minutes=duration_minutes)
        elif ends_at_iso:
            try:
                parsed_dt = datetime.fromisoformat(ends_at_iso.replace('Z', '+00:00'))
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                record.ends_at = parsed_dt
            except Exception:
                record.ends_at = None
        else:
            record.ends_at = None
    else:
        record.ends_at = None
        record.started_at = None

    db.commit()
    db.refresh(record)
    return get_maintenance_status(db)

def disable_maintenance_mode(db: Session, updated_by: str = "admin") -> Dict[str, Any]:
    return set_maintenance_mode(db, enabled=False, updated_by=updated_by)
