import os
import multiprocessing
import uvicorn
import platform

if __name__ == "__main__":
    print("=============================================")
    print("   Affyne Labs  -  Mythri Production Backend Runner      ")
    print("=============================================")
    
    # Calculate optimal workers for I/O bound tasks
    # Usually 2 * cores + 1
    cores = multiprocessing.cpu_count()
    workers = (cores * 2) + 1
    
    # Cap workers at 8 to prevent memory exhaustion from preloaded models
    workers = min(workers, 8)
    
    print(f"[RUNNER] Detected {cores} CPU cores. Starting {workers} Uvicorn workers.")
    print("[RUNNER] Enabling highly concurrent settings...")

    uvicorn.run(
        "app:app", 
        host="0.0.0.0", 
        port=8000, 
        workers=workers,
        timeout_keep_alive=60,
        limit_concurrency=1000,
        log_level="info"
    )

