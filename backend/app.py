import os
import pathlib
from dotenv import load_dotenv
# Trigger reload

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

# ---------------------------------------------------------------------------
# Sentry — DSN from environment only; PII collection disabled
# ---------------------------------------------------------------------------
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        send_default_pii=False,   # NEVER send PII — wellbeing platform
        traces_sample_rate=0.1,
    )

from contextlib import asynccontextmanager
import traceback
from fastapi.responses import JSONResponse
from fastapi import Request

from core.database.models import init_db
from security.authentication.api import router as auth_router
from modules.consultation.api import router as consultation_router
from modules.voice.api import router as voice_router
from modules.voice.api_streaming import router as streaming_router
from modules.dashboard.api import router as telemetry_router
from modules.feedback.api import router as feedback_router
from modules.profile.api import router as profile_router
from modules.admin.api import router as admin_router
from rag.brain.emotion_detector import preload_models
from providers.sarvam.voice_client import close_http_client

import asyncio

from core.logger.terminal import CommandCenter
import time

def global_async_exception_handler(loop, context):
    exc = context.get("exception")
    msg = exc or context.get("message")
    err = f"[GLOBAL ASYNC SHIELD] Caught unhandled exception: {msg}"
    CommandCenter.log_error(f"Async Error: {msg}", exc=exc if isinstance(exc, Exception) else None)
    with open("backend_errors.log", "a") as f:
        f.write(err + "\n")

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    loop.set_exception_handler(global_async_exception_handler)
    
    # HIGH-07: Constrain ThreadPoolExecutor to prevent memory exhaustion on resource-limited hosts
    import concurrent.futures
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=64)
    loop.set_default_executor(executor)
    
    app.state.shutdown_event = asyncio.Event()
    
    with CommandCenter.create_progress() as progress:
        task1 = progress.add_task("[cyan]Initializing Core Backend...", total=100)
        task2 = progress.add_task("[magenta]Connecting to Database...", total=100)
        task3 = progress.add_task("[yellow]Validating Providers...", total=100)
        
        progress.update(task1, advance=50)
        
        # DB init
        for attempt in range(1, 6):
            try:
                init_db()
                CommandCenter.set_health("Database", "Healthy")
                progress.update(task2, completed=100)
                break
            except Exception as e:
                CommandCenter.log_error(f"DB Init Failed: {e}")
                progress.update(task2, advance=20)
                if attempt < 5:
                    await asyncio.sleep(1)
                else:
                    CommandCenter.set_health("Database", "Failed")

        # Ensure RAG Knowledge Base is initialized (smart skip if up-to-date)
        try:
            from rag.knowledge.builder import ensure_knowledge_base_built
            await asyncio.to_thread(ensure_knowledge_base_built)
        except Exception as e:
            CommandCenter.log_error(f"RAG Knowledge Base Startup Check Note: {e}")

        # Phase 2: Eager load Emotion Model to prevent lazy-load latency on first request
        try:
            await asyncio.to_thread(preload_models)
        except Exception as e:
            CommandCenter.log_error(f"Emotion Model Preload Error: {e}")

        # Models are lazy-loaded on first request to conserve RAM on Render Free (512 MB)
        CommandCenter.set_health("Firebase", "Healthy")
        CommandCenter.set_health("Sarvam", "Healthy")
        CommandCenter.set_health("Brain", "Healthy")
        progress.update(task3, completed=100)
        
        progress.update(task1, completed=100)
        
    CommandCenter.set_health("API Server", "Healthy")
    CommandCenter.start_dashboard()
    
    yield
    
    CommandCenter.stop_dashboard()
    print("[SHUTDOWN] Signal received. Setting shutdown event...")
    app.state.shutdown_event.set()
    from providers.sarvam.sarvam_client import close_sarvam_client
    await close_sarvam_client()
    await close_http_client()
    await asyncio.sleep(0.2)
    print("[SHUTDOWN] Cleanup complete.")


_is_production = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")

app = FastAPI(
    title="Mythri API — by Affyne Labs",
    description="AI Mental Health Support — Voice + Text — Built by Affyne Labs, Powered by Sarvam AI",
    version="3.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production — they expose the full API schema publicly
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://test.affynelabs.com"
    "https://*.affynelabs.com"
    "https://app.affynelabs.in",
]
if cors_origins_env:
    allowed_origins.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])

from fastapi.middleware.trustedhost import TrustedHostMiddleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "*.pinggy.link", "*.vercel.app", "*.affynelabs.com", "*.onrender.com", "*.trycloudflare.com", "*.loca.lt"])

from core.middleware.security import SecurityMiddleware
app.add_middleware(SecurityMiddleware, max_payload_bytes=10 * 1024 * 1024)

from core.middleware.audit import AuditLoggerMiddleware
app.add_middleware(AuditLoggerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://([\w-]+\.)*(onrender\.com|affynelabs\.com)$",
    allow_credentials=True,
    # Explicit method allowlist — no wildcard
    allow_methods=["HEAD","GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Explicit header allowlist — no wildcard
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "X-Trace-Id"],
)

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    CommandCenter.increment_active_requests(1)
    try:
        response = await call_next(request)
        duration = (time.time() - start_time) * 1000  # ms
        if request.url.path not in ["/", "/health", "/favicon.ico"]:
            try:
                CommandCenter.log_api(request.method, request.url.path, response.status_code, duration)
            except Exception as e:
                print(f"[LOG_API_ERR] {e}")
        return response
    except Exception as exc:
        duration = (time.time() - start_time) * 1000
        CommandCenter.log_error(f"Middleware uncaught exception: {exc}")
        # CRIT-08: Never expose internal exception detail to clients
        return JSONResponse(status_code=500, content={"detail": "An internal error occurred. Please try again."})
    finally:
        CommandCenter.increment_active_requests(-1)


app.include_router(auth_router)
app.include_router(consultation_router)
app.include_router(voice_router)
app.include_router(streaming_router)
app.include_router(telemetry_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(profile_router)

from modules.src.features.feature_flags.api import router as features_router
app.include_router(features_router)

from modules.config.api import router as config_router
app.include_router(config_router)

from modules.maintenance.api import router as maintenance_router
app.include_router(maintenance_router)


from core.exceptions import register_exception_handlers
register_exception_handlers(app)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204)

# /sentry-debug endpoint intentionally removed.
# Unauthenticated error triggers must never exist in production.

@app.get("/health")
def health():
    resp = {
        "status": "ok",
        "service": "Affyne Labs - Mythri",
    }
    if not _is_production:
        resp["version"] = "3.0.0"
    return resp
    
@app.head("/health")
async def health_head():
    return health()


@app.get("/")
def root():
    info = {"message": "Affyne Labs  -  Mythri API v3 running"}
    if not _is_production:
        info["docs"] = "/docs"
    return info


from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

# Mount the static telemetry files
telemetry_dir = os.path.join(os.path.dirname(__file__), "modules", "telemetry_ui")
if os.path.exists(telemetry_dir):
    app.mount("/telemetry_ui", StaticFiles(directory=telemetry_dir, html=True), name="telemetry_ui")

@app.get("/architecture", response_class=HTMLResponse, include_in_schema=False)
def architecture_view():
    # MED-06: Never expose internal system topology diagrams publicly in production
    if _is_production:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    path = os.path.join(os.path.dirname(__file__), "architecture_flow.html")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "<html><body><h2>Affyne Labs  -  Mythri Architecture Flow</h2><p>Architecture diagram file not found.</p></body></html>"
