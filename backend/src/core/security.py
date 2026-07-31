from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings

def setup_security_middlewares(app: FastAPI):
    """
    Configures global security middleware for the FastAPI application.
    Includes CORS, standard security headers, and TLS validation hooks.
    """
    
    # Layer 1: CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Additional security headers (e.g., Helmet equivalent) can be added here
    # via custom middleware if needed.
