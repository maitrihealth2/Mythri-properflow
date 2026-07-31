from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio
from loguru import logger

from src.core.config import settings
from src.core.logging import GlobalExceptionInterceptor
from src.core.security import setup_security_middlewares
from src.database.connection import init_db

# Import domain routers
from src.modules.consultation.router import router as consultation_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles robust initialization and graceful shutdown of the application.
    """
    logger.info("Initializing Core Backend Infrastructure...")
    
    # 1. Initialize DB Connection
    try:
        init_db()
        logger.info("Database connection and tables initialized.")
    except Exception as e:
        logger.critical(f"Failed to connect to database: {e}")
        # In a strict environment, we might sys.exit(1) here if DB is strictly required.

    # 2. Warm up AI / RAG Engines (To be implemented in src/engines)
    logger.info("Pre-warming ML models and Vector stores...")
    await asyncio.sleep(0.5) # Mock warm-up
    
    logger.info("MindBridge Backend API started successfully.")
    
    yield
    
    # Graceful Shutdown
    logger.info("Shutting down MindBridge Backend API gracefully...")
    # Add cleanup logic here for Redis, ML resources, etc.

def create_app() -> FastAPI:
    """
    Application Factory Pattern for creating the FastAPI instance.
    """
    app = FastAPI(
        title="MindBridge Enterprise API",
        description="Highly secure, distributed AI Mental Health Support Backend.",
        version="4.0.0",
        lifespan=lifespan,
    )
    
    # Attach Middlewares (LIFO order: lowest first)
    app.add_middleware(GlobalExceptionInterceptor)
    setup_security_middlewares(app)
    
    # Attach Modular Routers
    app.include_router(consultation_router)
    
    # Fallback to old routers during migration phase
    try:
        from security.authentication.api import router as old_auth_router
        from modules.voice.api import router as old_voice_router
        from modules.dashboard.api import router as old_dashboard_router
        from modules.feedback.api import router as old_feedback_router
        
        app.include_router(old_auth_router)
        app.include_router(old_voice_router)
        app.include_router(old_dashboard_router)
        app.include_router(old_feedback_router)
        logger.info("Legacy routers mounted successfully for migration phase.")
    except ImportError as e:
        logger.warning(f"Could not load legacy routers: {e}")
        
    @app.get("/health", tags=["system"])
    def health_check():
        return {
            "status": "ok",
            "environment": settings.ENVIRONMENT,
            "version": "4.0.0"
        }
        
    return app

# The ASGI application instance
app = create_app()
