import os
import pathlib
from dotenv import load_dotenv

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import traceback
from fastapi.responses import JSONResponse
from fastapi import Request

from db.models import init_db
from api.auth import router as auth_router
from api.consultation import router as consultation_router
from api.voice import router as voice_router
from api.streaming import router as streaming_router
from api.telemetry import router as telemetry_router
from api.feedback import router as feedback_router

import asyncio

def global_async_exception_handler(loop, context):
    msg = context.get("exception", context["message"])
    err = f"[GLOBAL ASYNC SHIELD] Caught unhandled exception: {msg}"
    print(err)
    with open("backend_errors.log", "a") as f:
        f.write(err + "\n")

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    loop.set_exception_handler(global_async_exception_handler)
    
    app.state.shutdown_event = asyncio.Event()
    print("Starting MindBridge backend (Phase 3 — Voice)...")
    
    # DB init with retry — handles rapid restart where DB pool is briefly unavailable
    import time
    for attempt in range(1, 6):
        try:
            init_db()
            print(f"Database ready (attempt {attempt})")
            break
        except Exception as e:
            print(f"[DB] Init attempt {attempt}/5 failed: {e}")
            if attempt < 5:
                time.sleep(1)
            else:
                print("[DB] Could not connect after 5 attempts. Proceeding without DB.")
    
    yield
    print("[SHUTDOWN] Signal received. Setting shutdown event...")
    app.state.shutdown_event.set()
    # Small wait to let tasks notice the event before force-kill
    await asyncio.sleep(0.2)
    print("[SHUTDOWN] Cleanup complete.")


app = FastAPI(
    title="MindBridge API",
    description="AI Mental Health Support — Voice + Text — Powered by Sarvam AI",
    version="3.0.0",
    lifespan=lifespan,
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://maitri-v6-frontend.onrender.com",
]
if cors_origins_env:
    allowed_origins.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(consultation_router)
app.include_router(voice_router)
app.include_router(streaming_router)
app.include_router(telemetry_router)
app.include_router(feedback_router)


from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def log_error_to_file(msg: str):
    with open("backend_errors.log", "a") as f:
        f.write(msg + "\n")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err = f"INTERNAL SERVER ERROR: {str(exc)}\n{traceback.format_exc()}"
    print(err)
    log_error_to_file(err)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    err = f"VALIDATION ERROR: {exc.errors()}"
    print(err)
    log_error_to_file(err)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    err = f"HTTP EXCEPTION: {exc.status_code} - {exc.detail}"
    print(err)
    log_error_to_file(err)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "MindBridge",
        "version": "3.0.0",
        "features": ["text-chat", "voice-stt", "voice-tts", "rag", "emotion-detection"],
        "ai": "sarvam-105b + saarika + bulbul",
    }


@app.get("/")
def root():
    return {"message": "MindBridge API v3 running", "docs": "/docs"}


from fastapi.responses import HTMLResponse
import os

@app.get("/architecture", response_class=HTMLResponse)
def architecture_view():
    path = os.path.join(os.path.dirname(__file__), "architecture_flow.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()