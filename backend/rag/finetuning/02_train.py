"""
02_train.py
============
QLoRA fine-tuning of Sarvam-2B on Maitri's therapeutic knowledge.

Optimized for: RTX 4050 Laptop GPU (6GB VRAM), Windows, CUDA 12.x

What this does:
  1. Loads sarvamai/sarvam-2b-v0.5 in 4-bit (NF4 quantization)
  2. Attaches LoRA adapters to attention + FFN layers
  3. Trains on finetuning/data/train.jsonl
  4. Evaluates on finetuning/data/eval.jsonl after each epoch
  5. Logs all metrics to finetuning/results/training_log.json
  6. Saves adapter weights to finetuning/model/maitri-sarvam-2b-adapter/

Run:
  python finetuning/02_train.py

After training, run:
  python finetuning/03_evaluate.py   -- detailed evaluation
  python finetuning/04_plot_results.py -- all graphs
"""

import json
import math
import pathlib
import sys
import time
import os

# Force UTF-8 on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent

DATA_DIR = SCRIPT_DIR / "data"
MODEL_OUTPUT_DIR = SCRIPT_DIR / "model" / "maitri-sarvam-2b-adapter"
RESULTS_DIR = SCRIPT_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)
MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Configuration -- tuned for RTX 4050 6GB
# ---------------------------------------------------------------------------
CONFIG = {
    "base_model": "sarvamai/sarvam-2b-v0.5",
    "max_seq_length": 512,
    "num_train_epochs": 3,
    "per_device_train_batch_size": 1,
    "per_device_eval_batch_size": 1,
    "gradient_accumulation_steps": 8,    # effective batch = 8
    "learning_rate": 2e-4,
    "weight_decay": 0.01,
    "warmup_ratio": 0.05,
    "lr_scheduler_type": "cosine",
    "logging_steps": 5,
    "eval_steps": 50,
    "save_steps": 100,
    "optim": "paged_adamw_8bit",
    # LoRA settings
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "lora_target_modules": [
        "q_proj", "v_proj", "k_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    # 4-bit quantization
    "load_in_4bit": True,
    "bnb_4bit_quant_type": "nf4",
    "bnb_4bit_compute_dtype": "float16",
    "bnb_4bit_use_double_quant": True,
}

# ---------------------------------------------------------------------------
# Metric logger -- records every training event
# ---------------------------------------------------------------------------
class MetricLogger:
    def __init__(self, path: pathlib.Path):
        self.path = path
        self.log = {
            "config": CONFIG,
            "train_loss": [],       # {"step": int, "loss": float, "lr": float}
            "eval_loss": [],        # {"epoch": int, "step": int, "loss": float, "perplexity": float}
            "epoch_summary": [],    # {"epoch": int, "avg_train_loss": float, "eval_loss": float}
            "training_time_seconds": 0,
            "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def record_train_step(self, step: int, loss: float, lr: float):
        self.log["train_loss"].append({"step": step, "loss": round(loss, 6), "lr": round(lr, 8)})
        self._save()

    def record_eval(self, epoch: int, step: int, eval_loss: float):
        perplexity = round(math.exp(min(eval_loss, 20)), 4)
        self.log["eval_loss"].append({
            "epoch": epoch, "step": step,
            "loss": round(eval_loss, 6),
            "perplexity": perplexity
        })
        print(f"  [Eval] Epoch {epoch} | Loss: {eval_loss:.4f} | Perplexity: {perplexity:.2f}")
        self._save()

    def record_epoch_summary(self, epoch: int, avg_train_loss: float, eval_loss: float):
        self.log["epoch_summary"].append({
            "epoch": epoch,
            "avg_train_loss": round(avg_train_loss, 6),
            "eval_loss": round(eval_loss, 6),
            "perplexity": round(math.exp(min(eval_loss, 20)), 4),
        })
        self._save()

    def finalize(self, total_seconds: float):
        self.log["training_time_seconds"] = round(total_seconds, 1)
        self.log["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        self._save()
        print(f"\n[Logger] Metrics saved to {self.path}")

    def _save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.log, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Custom HuggingFace callback to capture metrics
# ---------------------------------------------------------------------------
def make_trainer_callback(metric_logger: MetricLogger):
    from transformers import TrainerCallback

    class MaitriCallback(TrainerCallback):
        def __init__(self):
            self._epoch_losses = []

        def on_log(self, args, state, control, logs=None, **kwargs):
            if logs is None:
                return
            step = state.global_step
            if "loss" in logs:
                lr = logs.get("learning_rate", 0.0)
                metric_logger.record_train_step(step, logs["loss"], lr)
                self._epoch_losses.append(logs["loss"])

            if "eval_loss" in logs:
                epoch = int(state.epoch) if state.epoch else 0
                metric_logger.record_eval(epoch, step, logs["eval_loss"])

        def on_epoch_end(self, args, state, control, **kwargs):
            epoch = int(state.epoch)
            avg_train = sum(self._epoch_losses[-50:]) / max(len(self._epoch_losses[-50:]), 1)
            eval_entries = metric_logger.log["eval_loss"]
            last_eval = eval_entries[-1]["loss"] if eval_entries else 0.0
            metric_logger.record_epoch_summary(epoch, avg_train, last_eval)
            self._epoch_losses = []
            print(f"  [Epoch {epoch}] Avg train loss: {avg_train:.4f}")

    return MaitriCallback()


# ---------------------------------------------------------------------------
# Format dataset into ChatML prompt strings
# ---------------------------------------------------------------------------
def format_example(example: dict, tokenizer) -> str:
    """Format a ChatML conversation into a single training string."""
    messages = example["messages"]
    text = ""
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "system":
            text += f"<|system|>\n{content}\n"
        elif role == "user":
            text += f"<|user|>\n{content}\n"
        elif role == "assistant":
            text += f"<|assistant|>\n{content}\n"
    text += tokenizer.eos_token or "</s>"
    return text


# ---------------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Maitri QLoRA Fine-Tuning -- Sarvam-2B")
    print(f"Base model: {CONFIG['base_model']}")
    print(f"Device: RTX 4050 6GB (optimized)")
    print("=" * 60)

    # ---- Check prerequisites ----
    train_path = DATA_DIR / "train.jsonl"
    eval_path = DATA_DIR / "eval.jsonl"
    if not train_path.exists():
        print("\n[ERROR] Training data not found.")
        print("Run first: python finetuning/01_build_dataset.py")
        sys.exit(1)

    print("\n[1] Importing libraries...")
    import torch
    from transformers import (
        AutoTokenizer, AutoModelForCausalLM,
        TrainingArguments, BitsAndBytesConfig
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer
    from datasets import load_dataset

    if not torch.cuda.is_available():
        print("[WARNING] CUDA not available. Training on CPU will be very slow.")
        print("Ensure your NVIDIA drivers and CUDA 12.x toolkit are installed.")
    else:
        device = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"[GPU] {device} | {vram:.1f} GB VRAM")

    metric_logger = MetricLogger(RESULTS_DIR / "training_log.json")

    # ---- Load tokenizer ----
    print(f"\n[2] Loading tokenizer from {CONFIG['base_model']}...")
    tokenizer = AutoTokenizer.from_pretrained(
        CONFIG["base_model"],
        trust_remote_code=True,
        padding_side="right",
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # ---- 4-bit quantization config ----
    print("\n[3] Configuring 4-bit quantization (NF4)...")
    import torch
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=CONFIG["load_in_4bit"],
        bnb_4bit_quant_type=CONFIG["bnb_4bit_quant_type"],
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=CONFIG["bnb_4bit_use_double_quant"],
    )

    # ---- Load base model ----
    print(f"\n[4] Loading {CONFIG['base_model']} in 4-bit...")
    print("    (First run downloads ~1.5GB from HuggingFace)")
    model = AutoModelForCausalLM.from_pretrained(
        CONFIG["base_model"],
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # ---- LoRA config ----
    print("\n[5] Attaching LoRA adapters...")
    lora_config = LoraConfig(
        r=CONFIG["lora_r"],
        lora_alpha=CONFIG["lora_alpha"],
        target_modules=CONFIG["lora_target_modules"],
        lora_dropout=CONFIG["lora_dropout"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    trainable, total = model.get_nb_trainable_parameters()
    print(f"    Trainable: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

    # ---- Load dataset ----
    print("\n[6] Loading dataset...")
    dataset = load_dataset(
        "json",
        data_files={
            "train": str(train_path),
            "eval": str(eval_path),
        }
    )
    print(f"    Train: {len(dataset['train'])} | Eval: {len(dataset['eval'])}")

    # ---- Training arguments ----
    print("\n[7] Setting up training arguments...")
    training_args = TrainingArguments(
        output_dir=str(MODEL_OUTPUT_DIR),
        num_train_epochs=CONFIG["num_train_epochs"],
        per_device_train_batch_size=CONFIG["per_device_train_batch_size"],
        per_device_eval_batch_size=CONFIG["per_device_eval_batch_size"],
        gradient_accumulation_steps=CONFIG["gradient_accumulation_steps"],
        learning_rate=CONFIG["learning_rate"],
        weight_decay=CONFIG["weight_decay"],
        warmup_ratio=CONFIG["warmup_ratio"],
        lr_scheduler_type=CONFIG["lr_scheduler_type"],
        logging_steps=CONFIG["logging_steps"],
        eval_strategy="steps",
        eval_steps=CONFIG["eval_steps"],
        save_steps=CONFIG["save_steps"],
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        optim=CONFIG["optim"],
        fp16=True,
        report_to="none",
        dataloader_pin_memory=False,
        remove_unused_columns=True,
    )

    # ---- SFT Trainer ----
    print("\n[8] Initializing SFTTrainer...")

    def formatting_func(example):
        return [format_example({"messages": msgs}, tokenizer)
                for msgs in example["messages"]]

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["eval"],
        formatting_func=formatting_func,
        max_seq_length=CONFIG["max_seq_length"],
        callbacks=[make_trainer_callback(metric_logger)],
    )

    # ---- Train ----
    print("\n[9] Starting training...")
    print(f"    Epochs: {CONFIG['num_train_epochs']}")
    print(f"    Steps per epoch: ~{len(dataset['train']) // CONFIG['gradient_accumulation_steps']}")
    print("-" * 60)

    start_time = time.time()
    trainer.train()
    elapsed = time.time() - start_time
    metric_logger.finalize(elapsed)

    # ---- Save adapter ----
    print(f"\n[10] Saving LoRA adapter to {MODEL_OUTPUT_DIR}...")
    trainer.save_model(str(MODEL_OUTPUT_DIR))
    tokenizer.save_pretrained(str(MODEL_OUTPUT_DIR))

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Adapter saved to: {MODEL_OUTPUT_DIR}")
    print(f"  Metrics log: {RESULTS_DIR / 'training_log.json'}")
    print("\nNext steps:")
    print("  python finetuning/03_evaluate.py")
    print("  python finetuning/04_plot_results.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
