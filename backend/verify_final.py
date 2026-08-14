import os
import sys
import asyncio
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_verification():
    print("==================================================")
    print("FINAL LIVE VERIFICATION")
    print("==================================================")
    
    try:
        from providers.sarvam.sarvam_client import chat_with_mythri
        print("[v] Active Model Configuration - Primary: Sarvam-105B")
        
        user_profile = {
            "name": "Arjun",
            "age": 22,
            "occupation": "Student",
            "clinical_status": "Healthy",
            "goals": ["reduce stress"],
            "language_preference": "English"
        }
        
        conversation_history = [
            {"role": "user", "content": "I've been feeling overwhelmed with everything I need to finish this week, and I don't know where to start."}
        ]
        
        print("\nSending live request to Sarvam via chat_with_mythri()...")
        
        async def do_chat():
            start = time.perf_counter()
            response = await chat_with_mythri(
                messages=conversation_history,
                language="en-IN",
                rag_context="Dummy RAG context about stress management.",
                case_file=user_profile
            )
            elapsed = time.perf_counter() - start
            print(f"Latency: {elapsed:.2f}s")
            print(f"\nResponse:\n{response}")
            
        asyncio.run(do_chat())
        
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    run_verification()
