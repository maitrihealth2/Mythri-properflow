import asyncio
import os
import sys
import json
import re
import pathlib

# Add the backend root to the sys.path
_BASE = pathlib.Path(__file__).resolve().parent.parent
sys.path.append(str(_BASE))

from providers.sarvam.sarvam_client import chat_with_maitri
from rag.brain.state_tracker import empty_case_file
from rag.brain.analyst import assess_turn

SCENARIOS = [
    {
        "name": "Ambiguous Emotional Change",
        "input": "I don't feel like myself lately."
    },
    {
        "name": "Habits with Unknown Causes",
        "input": "I've started doing this weird thing where I pace around my room every night."
    },
    {
        "name": "Burnout vs Grief",
        "input": "I just can't get out of bed. Everything feels heavy."
    },
    {
        "name": "Relationship Conflict vs Anxiety",
        "input": "My partner said something yesterday and my chest has been tight ever since."
    }
]


async def run_evaluations():
    print("==========================================")
    print("      CONVERSATION REASONING BENCHMARK    ")
    print("==========================================\n")
    
    passed_evals = 0
    total_evals = len(SCENARIOS)

    for i, scenario in enumerate(SCENARIOS):
        print(f"--- Scenario {i+1}: {scenario['name']} ---")
        print(f"User Input: \"{scenario['input']}\"\n")
        
        # 1. Initialize State
        case_file = empty_case_file()
        history = [{"role": "user", "content": scenario["input"]}]
        
        # 2. Run Assessor Phase
        print("[*] Running Assessor (Phase 4 & Hypothesis Generation)...")
        updated_case_file = await assess_turn(
            messages=history,
            case_file=case_file,
            user_message=scenario["input"],
        )
        
        phase = updated_case_file.get("conversation_state", {}).get("phase", "Listen")
        hypotheses = updated_case_file.get("conversation_state", {}).get("hypotheses", {})
        print(f"    Assessor Phase Detected: {phase}")
        print(f"    Top Hypotheses:")
        for h_name, h_conf in sorted(hypotheses.items(), key=lambda x: x[1], reverse=True)[:3]:
            print(f"      - {h_name}: {h_conf}%")
            
        # 3. Generate Response (with Reflection Engine)
        print("\n[*] Generating Response (Reflection Engine & Assumption Filter)...")
        
        # NOTE: chat_with_maitri is blocking (synchronous) so we don't await it here.
        ai_response = chat_with_maitri(
            messages=history,
            case_file=updated_case_file,
            language="English",
            rag_context="",
            language_prompt="English",
            is_crisis=False,
            exercise_phase="idle"
        )
        
        # 4. Extract Scratchpad
        scratchpad_match = re.search(r'<scratchpad>(.*?)</scratchpad>', ai_response, re.DOTALL | re.IGNORECASE)
        reflection = scratchpad_match.group(1).strip() if scratchpad_match else "No scratchpad found!"
        final_response = re.sub(r'<scratchpad>.*?</scratchpad>', '', ai_response, flags=re.DOTALL | re.IGNORECASE).strip()
        
        print("\n    Internal Reflection (<scratchpad>):")
        for line in reflection.split("\n"):
            print(f"      {line.strip()}")
            
        print("\n    Final AI Response:")
        print(f"      \"{final_response}\"")
        
        # 5. Automated Evaluation Logic
        passed = True
        
        # Rule 1: No advice given too early
        advice_words = ["meditate", "journal", "breathe", "grounding", "try to", "you should"]
        if phase != "Guide" and any(word in final_response.lower() for word in advice_words):
            print("\n    [FAILED] Gave advice outside of Guide phase.")
            passed = False
            
        # Rule 2: Asked a clarifying question when uncertain
        if phase in ["Listen", "Validate", "Clarify", "Explore"] and "?" not in final_response:
            print("\n    [FAILED] Did not ask a clarifying question in early stage.")
            passed = False
            
        # Rule 3: Scratchpad check
        if not scratchpad_match:
            print("\n    [FAILED] Did not output <scratchpad> for reflection.")
            passed = False
            
        if passed:
            print("\n    [PASSED] Evaluation")
            passed_evals += 1
            
        print("\n" + "="*50 + "\n")
        await asyncio.sleep(3)
        
    print(f"Benchmark Results: {passed_evals}/{total_evals} Passed.")
    if passed_evals == total_evals:
        print("Success: The AI is correctly validating and avoiding early assumptions!")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(str(_BASE / ".env"))
    load_dotenv(str(_BASE / ".env.local"), override=True)
    asyncio.run(run_evaluations())
