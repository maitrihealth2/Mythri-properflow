"""
03_evaluate.py
===============
Post-training evaluation of the fine-tuned Maitri model.

Metrics computed:
  - Perplexity        (language model quality)
  - ROUGE-1/2/L       (n-gram overlap with reference answers)
  - BLEU              (precision-based similarity)
  - BERTScore F1      (semantic similarity via embeddings)
  - Knowledge Retention Score (therapy-specific term accuracy)

Results saved to: finetuning/results/eval_metrics.json

Run:
  python finetuning/03_evaluate.py

Prerequisites:
  - Training must be complete (02_train.py)
  - pip install rouge-score bert-score nltk sacrebleu evaluate
"""

import json
import math
import pathlib
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
MODEL_DIR = SCRIPT_DIR / "model" / "maitri-sarvam-2b-adapter"
RESULTS_DIR = SCRIPT_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)
BASE_MODEL = "sarvamai/sarvam-2b-v0.5"

# Therapy-specific terms that a well-trained model should use correctly
THERAPY_TERMS = [
    "cognitive", "behavioral", "restructuring", "automatic thoughts",
    "distorted thinking", "dialectical", "acceptance", "mindfulness",
    "validation", "distress tolerance", "emotion regulation",
    "committed action", "values", "defusion", "transference",
    "unconscious", "attachment", "schema", "defense mechanism",
    "grounding", "breathing", "parasympathetic", "rumination",
    "avoidance", "exposure", "CBT", "DBT", "ACT",
]


def load_eval_data(path: pathlib.Path) -> list[dict]:
    examples = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    return examples


def extract_user_assistant(example: dict) -> tuple[str, str]:
    """Extract the user message and expected assistant response."""
    messages = example["messages"]
    user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
    assistant_msg = next((m["content"] for m in messages if m["role"] == "assistant"), "")
    return user_msg, assistant_msg


def generate_response(model, tokenizer, user_msg: str, system_prompt: str, max_new_tokens: int = 200) -> str:
    """Generate a response from the fine-tuned model."""
    import torch
    prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_msg}\n<|assistant|>\n"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=400).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=1.0,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def compute_perplexity(model, tokenizer, texts: list[str]) -> float:
    """Compute average perplexity on a list of texts."""
    import torch
    total_loss = 0.0
    count = 0

    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = model(**inputs, labels=inputs["input_ids"])
        loss = outputs.loss.item()
        if not math.isnan(loss) and not math.isinf(loss):
            total_loss += loss
            count += 1

    avg_loss = total_loss / max(count, 1)
    return math.exp(avg_loss)


def compute_knowledge_retention(generated_texts: list[str]) -> dict:
    """Custom metric: what % of expected therapy terms appear in generated text."""
    all_text = " ".join(generated_texts).lower()
    found = [term for term in THERAPY_TERMS if term.lower() in all_text]
    return {
        "score": round(len(found) / len(THERAPY_TERMS), 4),
        "terms_found": found,
        "terms_missing": [t for t in THERAPY_TERMS if t.lower() not in all_text],
        "total_terms": len(THERAPY_TERMS),
        "found_count": len(found),
    }


def main():
    print("=" * 60)
    print("Maitri Fine-Tuned Model Evaluation")
    print("=" * 60)

    if not MODEL_DIR.exists():
        print(f"\n[ERROR] Fine-tuned model not found at {MODEL_DIR}")
        print("Run: python finetuning/02_train.py")
        sys.exit(1)

    eval_path = DATA_DIR / "eval.jsonl"
    if not eval_path.exists():
        print(f"\n[ERROR] Eval data not found at {eval_path}")
        sys.exit(1)

    print("\n[1] Loading libraries...")
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from peft import PeftModel
    from rouge_score import rouge_scorer
    import nltk
    from bert_score import score as bert_score
    import numpy as np

    # Download NLTK data silently
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)
    from nltk.translate.bleu_score import corpus_bleu, SmoothingFunction

    print("\n[2] Loading fine-tuned model...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, quantization_config=bnb_config,
        device_map="auto", trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = PeftModel.from_pretrained(base, str(MODEL_DIR))
    model.eval()
    print("    Model loaded.")

    print("\n[3] Loading eval dataset...")
    examples = load_eval_data(eval_path)
    # Use up to 50 examples for evaluation (speed)
    examples = examples[:50]
    print(f"    Using {len(examples)} eval examples")

    system_prompt = (
        "You are Maitri, a warm and emotionally intelligent friend trained in evidence-based "
        "therapeutic approaches including CBT, DBT, ACT, and psychodynamic therapy."
    )

    references = []
    generated = []
    prompt_texts = []

    print("\n[4] Generating responses...")
    for i, ex in enumerate(examples):
        user_msg, ref_answer = extract_user_assistant(ex)
        gen_answer = generate_response(model, tokenizer, user_msg, system_prompt)
        references.append(ref_answer)
        generated.append(gen_answer)
        prompt_texts.append(f"<|system|>\n{system_prompt}\n<|user|>\n{user_msg}\n<|assistant|>\n{ref_answer}")
        if (i + 1) % 10 == 0:
            print(f"    {i+1}/{len(examples)} done")

    # ---- Perplexity ----
    print("\n[5] Computing perplexity...")
    perplexity = compute_perplexity(model, tokenizer, prompt_texts[:20])
    print(f"    Perplexity: {perplexity:.4f}")

    # ---- ROUGE ----
    print("\n[6] Computing ROUGE scores...")
    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    rouge1_scores, rouge2_scores, rougeL_scores = [], [], []
    for ref, gen in zip(references, generated):
        scores = scorer.score(ref, gen)
        rouge1_scores.append(scores["rouge1"].fmeasure)
        rouge2_scores.append(scores["rouge2"].fmeasure)
        rougeL_scores.append(scores["rougeL"].fmeasure)
    rouge_results = {
        "rouge1": round(float(np.mean(rouge1_scores)), 4),
        "rouge2": round(float(np.mean(rouge2_scores)), 4),
        "rougeL": round(float(np.mean(rougeL_scores)), 4),
        "per_sample": [
            {"rouge1": r1, "rouge2": r2, "rougeL": rL}
            for r1, r2, rL in zip(rouge1_scores, rouge2_scores, rougeL_scores)
        ]
    }
    print(f"    ROUGE-1: {rouge_results['rouge1']:.4f}")
    print(f"    ROUGE-2: {rouge_results['rouge2']:.4f}")
    print(f"    ROUGE-L: {rouge_results['rougeL']:.4f}")

    # ---- BLEU ----
    print("\n[7] Computing BLEU score...")
    smooth = SmoothingFunction().method1
    tokenized_refs = [[nltk.word_tokenize(r.lower())] for r in references]
    tokenized_gen = [nltk.word_tokenize(g.lower()) for g in generated]
    bleu = corpus_bleu(tokenized_refs, tokenized_gen, smoothing_function=smooth)
    print(f"    BLEU: {bleu:.4f}")

    # ---- BERTScore ----
    print("\n[8] Computing BERTScore (this may take a minute)...")
    P, R, F1 = bert_score(
        generated, references,
        lang="en",
        model_type="distilbert-base-uncased",
        verbose=False
    )
    bert_f1_scores = F1.tolist()
    bert_results = {
        "precision": round(float(P.mean()), 4),
        "recall": round(float(R.mean()), 4),
        "f1": round(float(F1.mean()), 4),
        "per_sample_f1": [round(x, 4) for x in bert_f1_scores],
    }
    print(f"    BERTScore P: {bert_results['precision']:.4f}")
    print(f"    BERTScore R: {bert_results['recall']:.4f}")
    print(f"    BERTScore F1: {bert_results['f1']:.4f}")

    # ---- Knowledge Retention ----
    print("\n[9] Computing knowledge retention score...")
    knowledge = compute_knowledge_retention(generated)
    print(f"    Knowledge Retention: {knowledge['score']*100:.1f}%")
    print(f"    Terms found: {knowledge['found_count']}/{knowledge['total_terms']}")

    # ---- Load training log for perplexity over epochs ----
    training_log = {}
    log_path = RESULTS_DIR / "training_log.json"
    if log_path.exists():
        with open(log_path) as f:
            training_log = json.load(f)

    # ---- Save all results ----
    eval_results = {
        "perplexity": round(perplexity, 4),
        "bleu": round(bleu, 4),
        "rouge": rouge_results,
        "bert_score": bert_results,
        "knowledge_retention": knowledge,
        "num_eval_examples": len(examples),
        "generated_samples": [
            {"user": extract_user_assistant(ex)[0][:100],
             "reference": r[:150], "generated": g[:150]}
            for ex, r, g in zip(examples[:5], references[:5], generated[:5])
        ],
    }

    out_path = RESULTS_DIR / "eval_metrics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print("EVALUATION COMPLETE")
    print(f"  Perplexity:        {perplexity:.4f}  (target < 5.0)")
    print(f"  BLEU:              {bleu:.4f}  (target > 0.20)")
    print(f"  ROUGE-L:           {rouge_results['rougeL']:.4f}  (target > 0.35)")
    print(f"  BERTScore F1:      {bert_results['f1']:.4f}  (target > 0.80)")
    print(f"  Knowledge Ret.:    {knowledge['score']*100:.1f}%  (target > 70%)")
    print(f"\n  Results saved to: {out_path}")
    print("\nNext step: python finetuning/04_plot_results.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
