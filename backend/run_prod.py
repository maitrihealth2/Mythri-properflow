"""
Affyne Labs - Mythri Production Backend Runner
Optimized for deployment on Render, Docker, Railway, and Cloud VMs.
Runs the backend cleanly with proxy headers, memory optimization, and high concurrency.
"""
import os
import sys
import pathlib

# Limit numerical backend threads to prevent memory/CPU thrashing on container environments
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ["ENVIRONMENT"] = "production"
os.environ.setdefault("SHOW_TERMINAL_FEED", "false")
os.environ.setdefault("SHOW_TOKEN_USAGE", "false")

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv
    load_dotenv(_BACKEND_DIR / ".env")
    if (_BACKEND_DIR / ".env.production").exists():
        load_dotenv(_BACKEND_DIR / ".env.production", override=True)
    elif (_BACKEND_DIR / ".env.local").exists():
        load_dotenv(_BACKEND_DIR / ".env.local", override=True)
except ImportError:
    pass

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    # 1 worker default is optimal for async Python on single-core / free-tier containers
    workers = int(os.getenv("WEB_CONCURRENCY", "1"))

    print("=====================================================")
    print("   Affyne Labs - Mythri Backend (Production Server)  ")
    print(f"   Port: {port} | Workers: {workers} | Environment: Production")
    print("=====================================================")

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        proxy_headers=True,
        forwarded_allow_ips="*",
        timeout_keep_alive=65,
        timeout_graceful_shutdown=10,
        limit_concurrency=1000,
        log_level="info",
        access_log=False,
    )
