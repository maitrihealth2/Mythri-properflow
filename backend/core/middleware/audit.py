import time
import logging
import json
import uuid
import re
from typing import Callable
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Configure structured audit logger
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler("audit.log")
file_handler.setFormatter(logging.Formatter("%(message)s"))
if not audit_logger.handlers:
    audit_logger.addHandler(file_handler)
audit_logger.propagate = False

# Sensitive fields to redact from logs
PII_FIELDS = [r"password", r"idToken", r"access_token"]
REDACT_STRING = "***REDACTED***"

class AuditLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        trace_id = str(uuid.uuid4())
        client_ip = request.client.host if request.client else "unknown"
        
        # We cannot easily log the body in Starlette middleware without consuming the stream,
        # so we log method, path, and IP
        
        response: Response = None
        error_msg = None
        try:
            response = await call_next(request)
        except Exception as e:
            error_msg = str(e)
            raise e
        finally:
            process_time = time.time() - start_time
            status_code = response.status_code if response else 500
            
            # Redact path query parameters if needed (e.g. ?token=...)
            safe_url = str(request.url)
            for field in PII_FIELDS:
                safe_url = re.sub(rf"({field})=[^&]+", rf"\1={REDACT_STRING}", safe_url, flags=re.IGNORECASE)
                
            log_data = {
                "trace_id": trace_id,
                "timestamp": time.time(),
                "method": request.method,
                "url": safe_url,
                "client_ip": client_ip,
                "status_code": status_code,
                "process_time_ms": round(process_time * 1000, 2),
            }
            if error_msg:
                log_data["error"] = error_msg
                
            audit_logger.info(json.dumps(log_data))
            
            if response:
                response.headers["X-Trace-Id"] = trace_id
                
        return response
