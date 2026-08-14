"""
05_inference_test.py
=====================
Interactive before/after test of base vs fine-tuned Mythri model.

Shows side-by-side responses so you can visually judge quality improvement.

Run:
  python finetuning/05_inference_test.py
"""

import pathlib
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
MODEL_DIR = SCRIPT_DIR / "model" / "mythri-sarvam-2b-adapter"
BASE_MODEL = "sarvamai/sarvam-2b-v0.5"

SYSTEM_PROMPT = (
    "You are Mythri, a warm and emotionally intelligent friend trained in evidence-based "
    "therapeutic approaches including CBT, DBT, ACT, and psychodynamic therapy. "
    "You understand Indian cultural contexts deeply. You respond warmly and concisely."
)

TEST_QUESTIONS = [
    "I feel so anxious all the time and I don't know why.",
    "What is cognitive restructuring?",
    "I can't stop thinking about how I failed the exam.",
    "My parents want me to do engineering but I want to study art.",
    "What are DBT distress tolerance skills?",
    "I've been feeling really low and hopeless lately.",
    "How do I practice mindfulness when I'm overwhelmed?",
    "What does acceptance mean in therapy?",
    "I feel guilty for being depressed when others have worse problems.",
    "What is the difference between CBT and DBT?",
]


def load_model(use_adapter: bool):
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    if use_adapter:
        from peft import PeftModel
        print(f"  Loading fine-tuned model from {MODEL_DIR}...")
        base = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL, quantization_config=bnb_config,
            device_map="auto", trust_remote_code=True
        )
        tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        model = PeftModel.from_pretrained(base, str(MODEL_DIR))
    else:
        print(f"  Loading base model {BASE_MODEL}...")
        model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL, quantization_config=bnb_config,
            device_map="auto", trust_remote_code=True
        )
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

    model.eval()
    return model, tokenizer


def generate(model, tokenizer, question: str, max_new_tokens: int = 200) -> str:
    import torch
    prompt = f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{question}\n<|assistant|>\n"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=400).to(model.device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
        )
    generated = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def print_separator(char="-", width=70):
    print(char * width)


def main():
    print("=" * 70)
    print("Mythri — Base vs Fine-Tuned Model Comparison")
    print("=" * 70)

    if not MODEL_DIR.exists():
        print(f"\n[ERROR] Fine-tuned model not found at {MODEL_DIR}")
        print("Run: python finetuning/02_train.py")
        sys.exit(1)

    print("\nSelect mode:")
    print("  1. Run all test questions (automatic)")
    print("  2. Interactive — type your own questions")
    choice = input("\nChoice (1/2): ").strip()

    print("\n[Loading base model...]")
    base_model, base_tokenizer = load_model(use_adapter=False)

    print("\n[Loading fine-tuned model...]")
    ft_model, ft_tokenizer = load_model(use_adapter=True)

    print("\n[Models ready]\n")

    questions = TEST_QUESTIONS if choice == "1" else []

    if choice == "2":
        print("Type your questions (empty line to quit):")
        while True:
            q = input("\nYou: ").strip()
            if not q:
                break
            questions.append(q)

    results = []
    for i, question in enumerate(questions, 1):
        print_separator("=")
        print(f"Question {i}: {question}")
        print_separator()

        print("[Base Sarvam-2B]:")
        base_answer = generate(base_model, base_tokenizer, question)
        print(f"  {base_answer}")

        print("\n[Fine-Tuned Mythri-2B]:")
        ft_answer = generate(ft_model, ft_tokenizer, question)
        print(f"  {ft_answer}")

        results.append({
            "question": question,
            "base_answer": base_answer,
            "finetuned_answer": ft_answer,
        })

    # Save comparison
    out_path = SCRIPT_DIR / "results" / "inference_comparison.json"
    import json
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print_separator("=")
    print(f"\nComparison saved to: {out_path}")
    print("Done.")


if __name__ == "__main__":
    main()
