import asyncio
import time
import json
import psutil
import threading
import httpx
from fastapi import FastAPI
from contextlib import asynccontextmanager
import traceback
import sys

# Track event loop delays
loop_delays = []
is_monitoring = True

async def monitor_event_loop():
    while is_monitoring:
        start = time.time()
        await asyncio.sleep(0.1)
        delay = (time.time() - start) - 0.1
        if delay > 0:
            loop_delays.append(delay)

def get_threadpool_metrics():
    # Thread pool metrics can be inferred by measuring blocking time or looking at the default executor
    loop = asyncio.get_event_loop()
    executor = getattr(loop, "_default_executor", None)
    if executor:
        return {
            "workers": executor._max_workers,
            "queue_size": executor._work_queue.qsize() if hasattr(executor, '_work_queue') else 0
        }
    return {}

# Start server in a separate thread so it has its own event loop, or use same loop?
# Better to run server in background thread so our test client doesn't get blocked by the server's starvation!
import uvicorn
from app import app
from security.authentication.api import get_current_user
from core.database.models import User, SessionLocal, Session as DBSession
import uuid

def mock_get_current_user():
    # Provide a real user from DB or dummy
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        user = User(username="audit_test", email="audit@test.com", hashed_password="pw")
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user

app.dependency_overrides[get_current_user] = mock_get_current_user

# Add middleware to track request timings internally
@app.middleware("http")
async def audit_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    response.headers["X-Audit-Duration"] = str(duration)
    return response

def run_server():
    config = uvicorn.Config(app, host="127.0.0.1", port=9999, log_level="warning")
    server = uvicorn.Server(config)
    server.run()

async def run_load_test(concurrency):
    url_start = "http://127.0.0.1:8000/api/consultation/start"
    url_msg = "http://127.0.0.1:8000/api/consultation/message"
    
    # Rest of run_load_test remains same...
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Start a session to get session_id
        # Use an explicit auth token if required, but the backend is running. Wait, the mock user was injected into app.py via dependency override!
        # If I remove the mock user from run_audit, the actual server won't have the mock user!
        # I need to use the token of a test user!
    
    results_db = {}
    
    for c in [1, 5, 10, 20, 30, 40, 50]:
        print(f"Testing concurrency: {c}")
        # Reset metrics
        global loop_delays
        loop_delays = []
        
        process = psutil.Process()
        cpu_start = process.cpu_percent()
        
        res = asyncio.run(run_load_test(c))
        
        cpu_end = process.cpu_percent()
        ram_mb = process.memory_info().rss / (1024 * 1024)
        
        if isinstance(res, dict) and "error" in res:
            results_db[c] = {"error": res["error"]}
        else:
            calls, total_dur = res
            durations = [r["duration"] for r in calls if r["status"] == 200]
            errors = [r for r in calls if r["status"] != 200]
            fallbacks = sum(1 for r in calls if r.get("fallback", False))
            
            durations.sort()
            
            metrics = {
                "avg_latency": sum(durations)/len(durations) if durations else 0,
                "median": durations[len(durations)//2] if durations else 0,
                "p95": durations[int(len(durations)*0.95)] if durations else 0,
                "p99": durations[int(len(durations)*0.99)] if durations else 0,
                "max_latency": max(durations) if durations else 0,
                "rps": c / total_dur if total_dur > 0 else 0,
                "success_rate": len(durations) / c,
                "failure_rate": len(errors) / c,
                "timeout_count": sum(1 for e in errors if "timeout" in str(e.get("error", "")).lower()),
                "fallback_count": fallbacks,
                "peak_ram_mb": ram_mb,
                "peak_cpu_percent": cpu_end,
                # Note: Loop delays inside the client process aren't the server's, we can't easily capture the server's event loop from here since it's in another thread. We'll rely on latency numbers which directly map to blocking.
            }
            results_db[c] = metrics
            print(metrics)
        
        time.sleep(2)
        
    with open("audit_results.json", "w") as f:
        json.dump(results_db, f, indent=2)
        
    print("Audit complete.")

if __name__ == "__main__":
    main()
