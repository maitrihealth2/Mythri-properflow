import asyncio
import time
import json
import httpx
import sys

PROMPTS = [
    {"domain": "Emotional support", "prompt": "I feel so overwhelmed and empty today after losing my childhood pet, I just need someone to talk to."},
    {"domain": "Anxiety", "prompt": "My heart starts racing every time I have to speak in a team meeting, and I can't breathe properly."},
    {"domain": "Stress", "prompt": "I have three major deadlines due tomorrow and my computer crashed twice. I don't know how to handle this pressure."},
    {"domain": "Happiness", "prompt": "I finally got accepted into my dream master's program today! I am so excited and happy!"},
    {"domain": "Relationship problems", "prompt": "My partner and I have been arguing constantly about minor household chores, and it feels like we're drifting apart."},
    {"domain": "Family concerns", "prompt": "My younger brother is dropping out of college and my parents are devastated and constantly fighting about it."},
    {"domain": "Work stress", "prompt": "My supervisor keeps reassigning my projects at the last minute and taking credit for my hard work."},
    {"domain": "Career guidance", "prompt": "I have been in software development for 5 years but I want to transition into product management. Where should I start?"},
    {"domain": "Casual conversation", "prompt": "What are some good habits to build for a calm and productive morning routine?"},
    {"domain": "Motivation", "prompt": "I've been trying to stick to a daily workout routine for weeks, but I keep losing motivation after a few days."},
    {"domain": "Memory recall", "prompt": "Can you recall what my main personal goals and coping strategies were from our previous sessions?"},
    {"domain": "Goal discussion", "prompt": "I want to set a realistic plan to publish my first fantasy novel by the end of this year."},
    {"domain": "Self-reflection", "prompt": "I noticed I always try to please everyone around me even when it hurts my own wellbeing. Why do I do this?"},
    {"domain": "General questions", "prompt": "What is the difference between Cognitive Behavioral Therapy (CBT) and Dialectical Behavior Therapy (DBT)?"},
    {"domain": "Small talk", "prompt": "Hey there! How has your day been going so far?"},
    {"domain": "Gratitude", "prompt": "I just wanted to take a moment to express how grateful I am for all the progress I've made in therapy lately."},
    {"domain": "Loneliness", "prompt": "Living alone in a new city feels really isolating. I don't really have anyone to share my daily experiences with."},
    {"domain": "Exam stress", "prompt": "My final board exams are in two days and I feel like my mind goes completely blank when I open my textbook."},
    {"domain": "Daily life", "prompt": "I'm trying to decide between cooking dinner at home or ordering takeout after a long exhausting day."},
    {"domain": "Mixed emotional scenarios", "prompt": "I got promoted at work today which is great, but it requires moving away from my family and friends, so I feel both thrilled and terrified."}
]

async def send_concurrent_prompt(client, session_info, prompt_data):
    url_msg = "http://127.0.0.1:8000/api/consultation/message"
    payload = {
        "session_id": session_info["session_id"],
        "message": prompt_data["prompt"],
        "language": "en-IN"
    }
    
    t0 = time.time()
    try:
        res = await client.post(url_msg, json=payload, headers=session_info["headers"])
        dur = time.time() - t0
        if res.status_code == 200:
            data = res.json()
            return {
                "idx": session_info["idx"],
                "session_id": session_info["session_id"],
                "domain": prompt_data["domain"],
                "prompt": prompt_data["prompt"],
                "status_code": 200,
                "duration": dur,
                "response": data.get("response", ""),
                "emotion": data.get("emotion", ""),
                "emotion_score": data.get("emotion_score", 0.0),
                "crse_applied": data.get("crse_applied", False),
                "rag_sources": data.get("rag_sources", []),
                "error": None
            }
        else:
            return {
                "idx": session_info["idx"],
                "session_id": session_info["session_id"],
                "domain": prompt_data["domain"],
                "prompt": prompt_data["prompt"],
                "status_code": res.status_code,
                "duration": dur,
                "response": None,
                "error": res.text
            }
    except Exception as e:
        return {
            "idx": session_info["idx"],
            "session_id": session_info["session_id"],
            "domain": prompt_data["domain"],
            "prompt": prompt_data["prompt"],
            "status_code": 500,
            "duration": time.time() - t0,
            "response": None,
            "error": str(e)
        }

async def main():
    print(f"Initializing 20 sessions for quality validation...")
    url_reg = "http://127.0.0.1:8000/api/auth/register"
    url_login = "http://127.0.0.1:8000/api/auth/login"
    url_start = "http://127.0.0.1:8000/api/consultation/start"
    
    username = f"master_qval_{int(time.time())}"
    email = f"{username}@example.com"
    pwd = "QualityPassword123!"
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # Register master account
        await client.post(url_reg, json={"username": username, "email": email, "password": pwd})
        
        # Login master account
        login_res = await client.post(url_login, json={"email": email, "password": pwd})
        if login_res.status_code != 200:
            print(f"Master login failed: {login_res.status_code} {login_res.text}")
            return
            
        token = login_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create 20 distinct sessions
        session_infos = []
        for i in range(len(PROMPTS)):
            s_res = await client.post(url_start, headers=headers)
            if s_res.status_code == 200:
                sid = s_res.json().get("session_id")
                session_infos.append(({"idx": i+1, "session_id": sid, "headers": headers}, PROMPTS[i]))
            else:
                print(f"Failed to start session {i+1}: {s_res.status_code}")
                
        print(f"Successfully created {len(session_infos)} sessions. Launching 20 simultaneous concurrent prompts...")
        
        t_start = time.time()
        tasks = [send_concurrent_prompt(client, s_info, p_data) for s_info, p_data in session_infos]
        results = await asyncio.gather(*tasks)
        t_total = time.time() - t_start
        
        output_data = {
            "total_sessions": len(session_infos),
            "total_test_duration": t_total,
            "results": results
        }
        
        with open("quality_test_results.json", "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
            
        print(f"Quality validation complete in {t_total:.2f}s. Results written to quality_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())
