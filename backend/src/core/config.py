from typing import List, Optional
import sys
import os
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

class AppConfig(BaseSettings):
    """
    Core Runtime Environment Enforcer.
    Validates all critical environment variables on startup.
    Fails fast with explicit reporting if misconfigured.
    """
    # Environment Settings
    ENVIRONMENT: str = Field(default="development", pattern="^(development|testing|staging|production)$")
    DEBUG: bool = Field(default=False)
    
    # Server Configurations
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000, ge=1024, le=65535)
    WORKERS: int = Field(default=1, ge=1)
    
    # Security & Networking
    SECRET_KEY: str = Field(..., min_length=32, description="Must be at least 32 characters for AES-256 equivalent security.")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, gt=0)
    CORS_ORIGINS: List[str] = Field(default=["*"], description="Comma-separated list of allowed origins.")
    
    # Database Configuration
    DATABASE_URL: str = Field(..., pattern="^(postgresql|sqlite|mysql)\+?(asyncpg|aiosqlite|pymysql)?://.*")
    DB_POOL_SIZE: int = Field(default=20, ge=1)
    DB_MAX_OVERFLOW: int = Field(default=10, ge=0)
    
    # AI Engine Services
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    SARVAM_API_KEY: Optional[str] = Field(default=None)
    
    # Redis for Distributed Rate Limiting / Celery
    REDIS_URL: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", ".env.testing", ".env.production"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

def load_config() -> AppConfig:
    try:
        print("[INIT] Bootstrapping Runtime Environment Enforcer...")
        config = AppConfig()
        print(f"[SUCCESS] Environment validated successfully for: {config.ENVIRONMENT.upper()}")
        return config
    except ValidationError as e:
        print("\n=======================================================")
        print("[FATAL ERROR] ENVIRONMENT MISCONFIGURATION DETECTED")
        print("=======================================================")
        print("The application failed to start due to missing or invalid environment variables.\n")
        for error in e.errors():
            loc = " -> ".join(map(str, error["loc"]))
            print(f"❌ Field: {loc}")
            print(f"   Error: {error['msg']}")
            print(f"   Input: {error.get('input', 'N/A')}\n")
        print("=======================================================")
        print("System shutdown initiated. Please fix the above errors.")
        sys.exit(1)

# Global singleton
settings = load_config()
