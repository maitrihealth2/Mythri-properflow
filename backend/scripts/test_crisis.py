import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from security.crisis_handler import check_for_crisis

# 1. False Positive tests (Should NOT trigger crisis)
FP_CASES = [
    "I am feeling so sad today.",
    "My stress at work is killing me.", # Metaphor
    "I'm tired of living in this city.", # Contextual
    "He said he was better off dead, but he is okay now.", # Third person
    "The world without me would be exactly the same.", # Existential/Sadness, but maybe high risk? 
    "I can't take it anymore, this traffic is horrible.", # Metaphorical
    "I wish this pain would stop.", # Normal emotional distress
]

# 2. False Negative tests (Should trigger crisis)
FN_CASES = [
    "I have pills and I'm going to take them all tonight.", # Explicit intent
    "I'm ending it all tomorrow.",
    "There's no point in living anymore.",
    "I just want to fall asleep and never wake up.", # High risk indirect
    "If I were gone, everyone would be happier.",
    "I am going to jump off the bridge.",
]

def run_tests():
    print("==================================================")
    print("CRISIS DETECTION TEST")
    print("==================================================\n")
    
    fp_triggered = 0
    fn_missed = 0
    
    print("--- TESTING FALSE POSITIVES (EXPECTED FALSE) ---")
    for text in FP_CASES:
        res = check_for_crisis(text)
        if res.is_crisis:
            print(f"❌ FAILED (Over-triggered): '{text}' -> Triggered by: {res.trigger_phrase}")
            fp_triggered += 1
        else:
            print(f"✅ PASSED: '{text}'")
            
    print("\n--- TESTING FALSE NEGATIVES (EXPECTED TRUE) ---")
    for text in FN_CASES:
        res = check_for_crisis(text)
        if not res.is_crisis:
            print(f"❌ FAILED (Missed): '{text}'")
            fn_missed += 1
        else:
            print(f"✅ PASSED (Caught): '{text}' -> Triggered by: {res.trigger_phrase}")
            
    print("\n==================================================")
    print(f"SUMMARY:")
    print(f"False Positives Triggered: {fp_triggered}/{len(FP_CASES)}")
    print(f"False Negatives Missed: {fn_missed}/{len(FN_CASES)}")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
