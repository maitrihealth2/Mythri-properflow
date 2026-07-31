from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class AbstractBaseModel(Base):
    """
    Abstract base model definition for tracking and data integrity.
    Provides standard fields across all domain models.
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), comment="Creation timestamp")
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), comment="Last modification timestamp")
