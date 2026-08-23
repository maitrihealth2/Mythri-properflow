import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rag.knowledge.retriever import retrieve_context

TEST_QUERIES = [
    {
        "query": "I keep thinking I'm a failure because I failed one test.",
        "expected_concept": "CBT (Cognitive Behavioral Therapy) - Cognitive Distortions",
        "keywords": ["distortion", "cbt", "cognitive", "all-or-nothing", "generalization", "therapy"]
    },
    {
        "query": "I am feeling extremely overwhelmed right now and I can't calm down. My heart is racing.",
        "expected_concept": "DBT (Dialectical Behavior Therapy) - Distress Tolerance / Grounding",
        "keywords": ["dbt", "distress tolerance", "grounding", "mindfulness", "dialectical", "therapy"]
    },
    {
        "query": "I feel like my childhood issues with my father are affecting my relationships.",
        "expected_concept": "Psychodynamic Theory",
        "keywords": ["psychodynamic", "childhood", "unconscious", "defense mechanisms", "freud", "transference", "therapy"]
    },
    {
        "query": "How can I accept my negative thoughts without fighting them?",
        "expected_concept": "ACT (Acceptance and Commitment Therapy)",
        "keywords": ["act", "acceptance", "commitment", "defusion", "values", "psychological flexibility", "therapy"]
    }
]

def run_tests():
    print("==================================================")
    print("RAG RETRIEVAL QUALITY EVALUATION")
    print("==================================================\n")
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(TEST_QUERIES):
        query = test["query"]
        expected = test["expected_concept"]
        keywords = test["keywords"]
        
        print(f"TEST {i+1}:")
        print(f"Query: {query}")
        print(f"Expected Concept: {expected}")
        
        # Retrieve context
        context = retrieve_context(query, n_results=3)
        
        if not context:
            print("Result: FAIL - No context retrieved.")
            failed += 1
            print("-" * 50)
            continue
            
        context_lower = context.lower()
        matched = False
        for kw in keywords:
            if kw in context_lower:
                matched = True
                break
                
        if matched:
            print("Result: PASS")
            passed += 1
        else:
            print("Result: FAIL - Retrieved chunks did not contain expected keywords.")
            failed += 1
            
        print("\nRetrieved Context Snippet:")
        print(context[:500] + ("..." if len(context) > 500 else ""))
        print("-" * 50)
        
    print("\n==================================================")
    print(f"SUMMARY: {passed} PASS, {failed} FAIL")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
