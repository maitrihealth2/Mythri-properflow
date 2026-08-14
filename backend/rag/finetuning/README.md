# Mythri Fine-Tuning Pipeline — Complete Run Guide
### `mythri-sarvam-2b` | QLoRA | RTX 4050 | Windows 11 | Python 3.11

---

## What This Does

Fine-tunes **Sarvam-2B** (`sarvamai/sarvam-2b-v0.5`) on Mythri's therapeutic knowledge base using **QLoRA** (4-bit quantized LoRA adapters). Produces a specialized model that understands CBT, DBT, ACT, and psychodynamic therapy in Indian cultural context.

After training, the pipeline evaluates the model and generates 8 publication-quality plots showing exactly how well the model learned.

---

## System Requirements

| Component | Required | This Machine |
|---|---|---|
| OS | Windows 10/11 64-bit | Windows 10 (Build 26200) |
| Python | 3.10 or 3.11 | 3.11.9 |
| GPU | NVIDIA with 6GB+ VRAM | RTX 4050 Laptop (6GB) |
| CUDA Toolkit | 12.1 or 12.4 | Install below |
| RAM | 16GB+ | 16GB |
| Disk space | ~10GB free | 157GB used / 477GB |

---

## Folder Structure (Where Everything Lives)

```
mythri-v4-main/
  backend/                        <-- YOU WORK FROM HERE
    finetuning/
      01_build_dataset.py         -- Step 1: Build training data
      02_train.py                 -- Step 2: Run QLoRA training
      03_evaluate.py              -- Step 3: Compute all metrics
      04_plot_results.py          -- Step 4: Generate all 8 graphs
      05_inference_test.py        -- Step 5: Test before vs after
      requirements_finetune.txt   -- GPU-specific packages
      README.md                   -- This file
      data/                       -- Created by Step 1
        train.jsonl               -- 119 training examples
        eval.jsonl                -- 21 evaluation examples
      model/                      -- Created by Step 2
        mythri-sarvam-2b-adapter/ -- Saved LoRA adapter weights
      results/                    -- Created by Steps 2, 3, 4
        training_log.json         -- All training metrics (loss, LR)
        eval_metrics.json         -- ROUGE, BLEU, BERTScore, Perplexity
        inference_comparison.json -- Before/after response comparison
        plots/
          00_summary_dashboard.png
          01_train_loss_curve.png
          02_eval_loss_curve.png
          03_perplexity_per_epoch.png
          04_rouge_scores.png
          05_bert_score_distribution.png
          06_learning_rate_schedule.png
          07_before_after_comparison.png
    knowledge/
      docs/
        cbt.txt                   -- CBT knowledge (source data)
        dbt.txt                   -- DBT knowledge (source data)
        act_and_general.txt       -- ACT knowledge (source data)
        psychodynamic_theory.txt  -- Psychodynamic theory (source data)
        structured/
          therapy_techniques.json
        transcripts/
          sample_dialogues.json
      finetuning_datasets/
        mythri_sft_dataset.jsonl  -- Hand-crafted conversation examples
        analyst_sft_dataset.jsonl -- Analyst phase examples
```

---

## Pre-Flight: Install CUDA Toolkit (Once, System-Wide)

Your GPU needs CUDA 12.x installed at the system level before PyTorch can use it.

1. Open: https://developer.nvidia.com/cuda-12-1-0-download-archive
2. Select: Windows → x86_64 → 11 → exe (network)
3. Download and run the installer (~50MB launcher, installs ~4GB)
4. Restart your machine after installation

Verify CUDA is installed:
```powershell
nvcc --version
# Should show: Cuda compilation tools, release 12.x
```

---

## Setup: Create the Fine-Tuning Virtual Environment

> IMPORTANT: Do NOT use the main backend venv (`venv/`).
> The main backend has CPU-only PyTorch. Fine-tuning needs a separate
> CUDA-enabled PyTorch. They must be kept separate.

Open PowerShell **as Administrator** and navigate to the backend folder:

```powershell
cd E:\MindBridge\Project\mythri-v4-main\backend
```

Create and activate the fine-tuning venv:

```powershell
python -m venv venv_finetune
venv_finetune\Scripts\activate
```

Your prompt should now show `(venv_finetune)` at the start.

Install CUDA-enabled PyTorch **first** (this is critical — must be before other packages):

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Verify GPU is detected:

```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
# Expected: CUDA: True | GPU: NVIDIA GeForce RTX 4050 Laptop GPU
```

Install the remaining fine-tuning packages:

```powershell
pip install -r finetuning/requirements_finetune.txt
```

> **If bitsandbytes fails on Windows**, run this instead:
> ```powershell
> pip install bitsandbytes --prefer-binary --extra-index-url=https://jllllll.github.io/bitsandbytes-windows-webui
> ```

---

## Step 1 — Build the Dataset

```powershell
# Make sure (venv_finetune) is active
python finetuning/01_build_dataset.py
```

**What happens:**
- Reads all `.txt` files from `knowledge/docs/`
- Loads existing JSONL examples from `knowledge/finetuning_datasets/`
- Builds 55 expert QA pairs covering CBT, DBT, ACT, psychodynamic theory, mindfulness, Indian cultural context, and emotional support
- Shuffles and splits 85/15 into train and eval

**Expected output:**
```
============================================================
Mythri Fine-Tuning Dataset Builder
============================================================

[1] Building QA pairs from domain knowledge...
  Built 55 structured QA pairs

[2] Loading existing conversation examples...
  Loaded 6 existing conversation examples

[3] Parsing knowledge text files...
  Parsed 20 examples from cbt.txt
  Parsed 20 examples from dbt.txt
  Parsed 19 examples from act_and_general.txt
  Parsed 20 examples from psychodynamic_theory.txt

[DONE] Dataset saved:
  Train: 119 examples -> ...\finetuning\data\train.jsonl
  Eval:  21 examples  -> ...\finetuning\data\eval.jsonl
  Total: 140 examples

Next step: python finetuning/02_train.py
```

---

## Step 2 — Train the Model

```powershell
python finetuning/02_train.py
```

**What happens:**
- Downloads `sarvamai/sarvam-2b-v0.5` from HuggingFace (~1.5GB, first run only, cached after)
- Loads it in 4-bit NF4 quantization (~2.3GB VRAM)
- Attaches LoRA adapters to all attention and FFN layers (only ~0.5% of params trained)
- Trains for 3 epochs with cosine LR schedule (warmup 5%)
- Evaluates on eval set every 50 steps
- Logs every metric to `finetuning/results/training_log.json`
- Saves best checkpoint to `finetuning/model/mythri-sarvam-2b-adapter/`

**Expected VRAM usage:** 4.5–5.5GB (stays within your 6GB)

**Expected training time:** 45–90 minutes

**Expected output (first few lines):**
```
============================================================
Mythri QLoRA Fine-Tuning -- Sarvam-2B
Base model: sarvamai/sarvam-2b-v0.5
Device: RTX 4050 6GB (optimized)
============================================================

[1] Importing libraries...
[GPU] NVIDIA GeForce RTX 4050 Laptop GPU | 6.0 GB VRAM
[2] Loading tokenizer...
[3] Configuring 4-bit quantization (NF4)...
[4] Loading sarvamai/sarvam-2b-v0.5 in 4-bit...
    (First run downloads ~1.5GB from HuggingFace)
[5] Attaching LoRA adapters...
    Trainable: 8,388,608 / 2,007,046,144 (0.42%)
[6] Loading dataset...
    Train: 119 | Eval: 21
[7] Setting up training arguments...
[8] Initializing SFTTrainer...
[9] Starting training...
```

**If you get Out of Memory (OOM):**

Open `finetuning/02_train.py` and find the `CONFIG` dictionary near the top. Change:
```python
"max_seq_length": 512,   # change to 384
"lora_r": 16,            # change to 8
```

---

## Step 3 — Evaluate

```powershell
python finetuning/03_evaluate.py
```

**What happens:**
- Loads the fine-tuned adapter on top of the base model
- Generates responses for up to 50 eval examples
- Computes 7 metrics comparing generated vs reference answers

**Metrics and targets:**

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| Perplexity | < 5.0 | How confidently the model predicts correct text. Lower = better. |
| BLEU | > 0.20 | Precision of generated words vs reference. Range: 0–1. |
| ROUGE-1 | > 0.45 | Unigram (single word) overlap with reference. Range: 0–1. |
| ROUGE-2 | > 0.20 | Bigram (two-word phrase) overlap. Range: 0–1. |
| ROUGE-L | > 0.35 | Longest common subsequence match. Range: 0–1. |
| BERTScore F1 | > 0.80 | Semantic similarity via contextual embeddings. Range: 0–1. |
| Knowledge Ret. | > 70% | % of therapy-specific terms used correctly in outputs. |

**Expected output:**
```
[5] Computing perplexity...
    Perplexity: 3.84
[6] Computing ROUGE scores...
    ROUGE-1: 0.4821
    ROUGE-2: 0.2310
    ROUGE-L: 0.4012
[7] Computing BLEU score...
    BLEU: 0.2145
[8] Computing BERTScore...
    BERTScore F1: 0.8312
[9] Computing knowledge retention...
    Knowledge Retention: 78.4%

============================================================
EVALUATION COMPLETE
  Results saved to: ...\finetuning\results\eval_metrics.json
============================================================
```

---

## Step 4 — Generate All Plots

```powershell
python finetuning/04_plot_results.py
```

**What happens:**
- Reads `training_log.json` and `eval_metrics.json`
- Generates 8 PNG plots into `finetuning/results/plots/`

**Plots generated:**

| File | Description |
|------|-------------|
| `00_summary_dashboard.png` | All key metrics on one card — good for sharing |
| `01_train_loss_curve.png` | Training loss per step (raw + smoothed) |
| `02_eval_loss_curve.png` | Train vs eval loss overlaid — shows overfitting if any |
| `03_perplexity_per_epoch.png` | Perplexity with target line at 5.0 |
| `04_rouge_scores.png` | ROUGE-1, ROUGE-2, ROUGE-L bar chart with targets |
| `05_bert_score_distribution.png` | Histogram of per-sample BERTScore F1 |
| `06_learning_rate_schedule.png` | Cosine LR decay with warmup |
| `07_before_after_comparison.png` | 5 side-by-side reference vs generated responses |

**Expected output:**
```
Generating plots...
  Saved: 01_train_loss_curve.png
  Saved: 02_eval_loss_curve.png
  Saved: 03_perplexity_per_epoch.png
  Saved: 04_rouge_scores.png
  Saved: 05_bert_score_distribution.png
  Saved: 06_learning_rate_schedule.png
  Saved: 07_before_after_comparison.png
  Saved: 00_summary_dashboard.png

ALL PLOTS SAVED to: ...\finetuning\results\plots\
```

---

## Step 5 — Test the Model (Before vs After)

```powershell
python finetuning/05_inference_test.py
```

**What happens:**
- Loads BOTH the base Sarvam-2B AND the fine-tuned Mythri-2B
- Shows responses side by side for 10 pre-set therapy questions

Choose mode when prompted:
- **Mode 1**: Automatic run on 10 built-in test questions
- **Mode 2**: Type your own questions interactively

**Sample output:**
```
======================================================================
Question 1: I feel so anxious all the time and I don't know why.
----------------------------------------------------------------------
[Base Sarvam-2B]:
  Anxiety can be caused by many factors including stress, health...

[Fine-Tuned Mythri-2B]:
  That constant background anxiety is exhausting — especially when you
  can't even name what's driving it. Sometimes the body holds stress
  before the mind understands it. Have you noticed if certain moments
  make it spike more than others?
======================================================================
```

Results saved to: `finetuning/results/inference_comparison.json`

---

## Full Command Sequence (Copy-Paste Ready)

```powershell
# --- Open PowerShell as Administrator ---

# 1. Navigate to backend
cd E:\MindBridge\Project\mythri-v4-main\backend

# 2. Create and activate fine-tuning venv
python -m venv venv_finetune
venv_finetune\Scripts\activate

# 3. Install CUDA PyTorch (do this FIRST)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 4. Verify GPU is detected
python -c "import torch; print('GPU:', torch.cuda.get_device_name(0))"

# 5. Install remaining packages
pip install -r finetuning/requirements_finetune.txt

# 6. Build dataset
python finetuning/01_build_dataset.py

# 7. Train (45-90 min)
python finetuning/02_train.py

# 8. Evaluate
python finetuning/03_evaluate.py

# 9. Generate all plots
python finetuning/04_plot_results.py

# 10. Test before vs after
python finetuning/05_inference_test.py
```

---

## Troubleshooting

### CUDA not detected after PyTorch install
```powershell
# Uninstall and reinstall with explicit CUDA version
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### bitsandbytes ImportError or CUDA error
```powershell
pip uninstall bitsandbytes -y
pip install bitsandbytes --prefer-binary --extra-index-url=https://jllllll.github.io/bitsandbytes-windows-webui
```

### Out of Memory (OOM) during training
Open `finetuning/02_train.py`, find the `CONFIG` block, change:
```python
"max_seq_length": 384,   # was 512
"lora_r": 8,             # was 16
"gradient_accumulation_steps": 16,  # was 8
```

### HuggingFace download fails / rate limited
```powershell
# Set your HuggingFace token (get one free at huggingface.co/settings/tokens)
$env:HUGGINGFACE_TOKEN = "hf_your_token_here"
huggingface-cli login --token $env:HUGGINGFACE_TOKEN
```

### Training loss not decreasing
The dataset is small (140 examples). This is expected for a prototype run.
The model should still show knowledge improvements on specific therapy questions.
To expand the dataset, edit `finetuning/01_build_dataset.py` and add more QA pairs
to the domain lists at the top of the file, then re-run Step 1.

### Scripts hang or show no output
Add this to the top of any script that seems stuck:
```python
import sys; sys.stdout.reconfigure(encoding='utf-8')
```

---

## Output Files Reference

| File | Created By | Contents |
|------|-----------|----------|
| `finetuning/data/train.jsonl` | Step 1 | 119 ChatML training examples |
| `finetuning/data/eval.jsonl` | Step 1 | 21 ChatML eval examples |
| `finetuning/model/mythri-sarvam-2b-adapter/` | Step 2 | LoRA adapter weights (~50-100MB) |
| `finetuning/results/training_log.json` | Step 2 | Per-step loss, LR, per-epoch summaries |
| `finetuning/results/eval_metrics.json` | Step 3 | ROUGE, BLEU, BERTScore, Perplexity, Knowledge Retention |
| `finetuning/results/inference_comparison.json` | Step 5 | Before/after responses per question |
| `finetuning/results/plots/*.png` | Step 4 | 8 graph PNG files |

---

## Model Details

| Property | Value |
|----------|-------|
| Base model | `sarvamai/sarvam-2b-v0.5` |
| Architecture | Llama-based, 2B parameters |
| Fine-tuning method | QLoRA (4-bit NF4 + LoRA adapters) |
| Adapter target modules | q_proj, v_proj, k_proj, o_proj, gate_proj, up_proj, down_proj |
| LoRA rank (r) | 16 |
| LoRA alpha | 32 |
| Trainable parameters | ~8.4M (0.42% of 2B) |
| Optimizer | paged_adamw_8bit |
| Learning rate | 2e-4 (cosine decay) |
| Warmup ratio | 5% |
| Epochs | 3 |
| Max sequence length | 512 tokens |
| Effective batch size | 8 (batch 1 × grad accumulation 8) |
| Training domain | CBT, DBT, ACT, Psychodynamic, Mindfulness, Indian cultural context |
| Training examples | 119 |
| Eval examples | 21 |
