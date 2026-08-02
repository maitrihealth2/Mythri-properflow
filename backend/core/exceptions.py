from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import uuid
from core.logger.terminal import CommandCenter

class DomainError(Exception):
    """Base class for all domain-level exceptions."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class ResourceNotFoundError(DomainError):
    def __init__(self, resource: str):
        super().__init__(message=f"{resource} not found", status_code=404)

class UnauthorizedError(DomainError):
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(message=detail, status_code=401)

def register_exception_handlers(app):
    
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message}
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Invalid request parameters", "errors": exc.errors()}
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Catch-all for unhandled exceptions (500)
        trace_id = str(uuid.uuid4())
        CommandCenter.log_error(f"Unhandled Exception [Trace: {trace_id}]: {str(exc)}", exc=exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "trace_id": trace_id
            }
        )
