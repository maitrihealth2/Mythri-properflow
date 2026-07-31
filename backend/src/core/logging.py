import sys
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger
import json

# ==========================================
# ENTERPRISE LOGGING CONFIGURATION
# ==========================================

# Remove default logger and configure structured JSON logging
logger.remove()
logger.add(
    "backend_errors.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
    level="ERROR",
    rotation="10 MB",
    retention="10 days",
    serialize=True,  # Structured JSON output
    backtrace=True,
    diagnose=True,
)
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")


class GlobalExceptionInterceptor(BaseHTTPMiddleware):
    """
    Unified Exception Interceptor Middleware.
    Catches all unhandled exceptions occurring in the request lifecycle.
    Prevents stack traces from leaking to the client while logging them
    structurally for debugging and monitoring.
    """
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Mask internal database traces or system errors
            error_id = hash(str(exc) + str(request.url))
            
            # Log structured trace to backend_errors.log
            logger.opt(exception=exc).error(
                "Unhandled Exception Caught",
                extra={
                    "error_id": error_id,
                    "path": request.url.path,
                    "method": request.method,
                    "client_ip": request.client.host if request.client else "unknown",
                    "exception_type": type(exc).__name__,
                }
            )

            # Return sanitized public response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred. Our engineers have been notified.",
                    "error_reference_id": str(error_id),
                }
            )
