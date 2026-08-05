import asyncio
import time
import json
import psutil
import httpx
from pydantic import BaseModel

async def register_and_login(client):
    url_reg = "http://127.0.0.1:8000/api/auth/register"
    url_login = "http://127.0.0.1:8000/api/auth/login"
    username = f"test_{int(time.time()*1000)}"
    email = f"{username}@test.com"
    pwd = "TestPassword123!"
    
    # Try register
    try:
        r = await client.post(url_reg, json={"username": username, "email": email, "password": pwd})
        print("Register:", r.status_code, r.text)
    except Exception as e:
        print("Register Exception:", e)
    
    # Try login
    try:
        res = await client.post(url_login, json={"email": email, "password": pwd})
        if res.status_code == 200:
            token = res.json().get("access_token")
            return token
    except Exception:
        pass
    return None

async def run_load_test(concurrency):
    url_start = "http://127.0.0.1:8000/api/consultation/start"
    url_msg = "http://127.0.0.1:8000/api/consultation/message"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        token = await register_and_login(client)
        if not token:
            return {"error": "Authentication failed. Server might be down or unreachable."}
        
        headers = {"Authorization": f"Bearer {token}"}
        
        start_res = await client.post(url_start, headers=headers)
        if start_res.status_code != 200:
            return {"error": f"Start failed: {start_res.status_code} {start_res.text}"}
        
        session_id = start_res.json().get("session_id")
        
        payload = {"session_id": session_id, "message": "I am feeling a bit stressed today. Can you help me?", "language": "en-IN"}
        
        async def send_msg(i):
            req_start = time.time()
            try:
                res = await client.post(url_msg, json=payload, headers=headers)
                duration = time.time() - req_start
                fallback = False
                if res.status_code == 200:
                    data = res.json()
                    fallback = data.get("emotion") == "Neutral" and data.get("emotion_score", 1.0) < 0.6
                return {"status": res.status_code, "duration": duration, "fallback": fallback, "text": res.text}
            except Exception as e:
                return {"status": "ERROR", "duration": time.time() - req_start, "fallback": True, "error": str(e)}

        start_time = time.time()
        tasks = [send_msg(i) for i in range(concurrency)]
        results = await asyncio.gather(*tasks)
        total_duration = time.time() - start_time
        
        return results, total_duration

def main():
    results_db = {}
    
    for c in [1, 10, 20, 30, 40, 50]:  # Up to 50 for Phase 3 certification
        print(f"Testing concurrency: {c}")
        
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
            }
            results_db[c] = metrics
            print(metrics)
        
        time.sleep(2)
        
    with open("live_audit_results.json", "w") as f:
        json.dump(results_db, f, indent=2)
        
    print("Audit complete.")

if __name__ == "__main__":
    main()
