import asyncio
import httpx
import time
import json
import os

API_URL = "http://127.0.0.1:8000/api"
USERS = [
    {"email": "test_1785937226393@test.com", "password": "TestPassword123!"},
    {"email": "test_1785937139368@test.com", "password": "TestPassword123!"},
    {"email": "test_1785937073306@test.com", "password": "TestPassword123!"}
]

async def login(client, email, password):
    res = await client.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code == 200:
        return res.json().get("access_token")
    else:
        print(f"Login failed for {email}: {res.status_code} {res.text}")
        return None

async def run_conversation(client, token, user_id, messages):
    print(f"--- Starting conversation for user {user_id} ---")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Onboarding
    profile = {
        "preferred_language": "English",
        "primary_goals": ["Manage stress", "Improve sleep", "Emotional support"],
        "communication_style": "gentle and supportive",
        "therapy_approach_preference": ["CBT", "Mindfulness"],
        "cultural_background": "Neutral"
    }
    await client.post(f"{API_URL}/user/onboarding", headers=headers, json=profile)
    
    # 2. Start session
    r = await client.post(f"{API_URL}/consultation/start", headers=headers)
    if r.status_code != 200:
        print("Start failed:", r.text)
        return
    session_id = r.json()["session_id"]
    
    transcript = []
    
    # 3. Send messages
    for idx, msg in enumerate(messages):
        start = time.time()
        res = await client.post(f"{API_URL}/consultation/message", headers=headers, json={"session_id": session_id, "message": msg}, timeout=120.0)
        latency = time.time() - start
        
        if res.status_code == 200:
            reply = res.text
            print(f"[User {user_id}] Msg {idx+1} Latency: {latency:.2f}s")
            transcript.append({"user": msg, "maitri": reply, "latency": latency})
        else:
            print(f"[User {user_id}] Msg {idx+1} Failed: {res.status_code} {res.text}")
            transcript.append({"user": msg, "error": res.text})
            
    with open(f"transcript_user_{user_id}.json", "w") as f:
        json.dump(transcript, f, indent=2)

async def main():
    async with httpx.AsyncClient(timeout=120.0) as client:
        tokens = []
        for u in USERS:
            token = await login(client, u["email"], u["password"])
            if token:
                tokens.append((token, u["email"]))
        
        if not tokens:
            print("No users could log in. Exiting.")
            return

        # Phase A: Single user 20-message conversation
        msgs = [
            "Hi Maitri, I'm feeling overwhelmed today.",
            "I have too much work and my boss is really demanding.",
            "I'm worried I might miss my deadline.",
            "Actually, I just feel like I'm not good enough.",
            "Can you help me calm down?",
            "I want to set a goal to manage my stress better.",
            "What kind of techniques from my preferences can I use?",
            "I'll try that mindfulness exercise.",
            "I feel a bit better now, thanks.",
            "By the way, what did I tell you my goal was?",
            "Do you remember why I was stressed?",
            "Yes, exactly. I want to change the topic now.",
            "I also struggle with sleep.",
            "It's hard to fall asleep because my mind keeps racing.",
            "What can I do before bed?",
            "I will try avoiding screens.",
            "Let's do a quick roleplay where you act as my demanding boss.",
            "Boss, I need an extension on the project.",
            "Okay, roleplay over. That was helpful.",
            "I think I'm ready to tackle the rest of my day."
        ]
        
        await run_conversation(client, tokens[0][0], 1, msgs)
        
        # Phase F & G: Rapid same-user & Multi-user
        if len(tokens) > 1:
            print("\n--- Starting Multi-User Test ---")
            tasks = []
            short_msgs_1 = ["Hello", "How are you?", "What's my goal?", "I'm stressed", "Help me"]
            short_msgs_2 = ["Hi", "I'm sad", "Why am I sad?", "What did I say earlier?", "Goodbye"]
            tasks.append(run_conversation(client, tokens[1][0], 2, short_msgs_1))
            tasks.append(run_conversation(client, tokens[2][0], 3, short_msgs_2))
            await asyncio.gather(*tasks)

asyncio.run(main())
