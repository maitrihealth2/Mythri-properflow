"""
Affyne Labs - Mythri Production Backend Runner
Optimized for deployment on Render, Docker, Railway, and Cloud VMs.
Runs the backend cleanly without development watchers or terminal feed noise.
"""
import os
import uvicorn

if __name__ == "__main__":
    # Ensure production environment flags are active
    os.environ["ENVIRONMENT"] = "production"
    os.environ.setdefault("SHOW_TERMINAL_FEED", "false")
    os.environ.setdefault("SHOW_TOKEN_USAGE", "false")

    port = int(os.getenv("PORT", 8000))
    # 1 worker default is recommended for single-instance / free-tier containers to prevent RAM exhaustion
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
        timeout_keep_alive=60,
        limit_concurrency=1000,
        log_level="info",
        access_log=False,
    )
