"""
04_plot_results.py
===================
Generates all training and evaluation graphs.

Plots produced (saved to finetuning/results/plots/):
  01_train_loss_curve.png         -- Training loss per step
  02_eval_loss_curve.png          -- Eval loss overlaid with train loss
  03_perplexity_per_epoch.png     -- Perplexity progression
  04_rouge_scores.png             -- ROUGE-1 / ROUGE-2 / ROUGE-L bar chart
  05_bert_score_distribution.png  -- BERTScore F1 histogram
  06_learning_rate_schedule.png   -- LR cosine decay curve
  07_before_after_comparison.png  -- Sample response quality comparison

Run:
  python finetuning/04_plot_results.py
"""

import json
import pathlib
import math
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
RESULTS_DIR = SCRIPT_DIR / "results"
PLOTS_DIR = RESULTS_DIR / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_LOG = RESULTS_DIR / "training_log.json"
EVAL_METRICS = RESULTS_DIR / "eval_metrics.json"


def load_json(path: pathlib.Path) -> dict:
    if not path.exists():
        print(f"[WARNING] {path.name} not found -- skipping plots that depend on it")
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def setup_style():
    import matplotlib
    matplotlib.use("Agg")  # Non-interactive backend (no display needed)
    import matplotlib.pyplot as plt
    import seaborn as sns

    plt.rcParams.update({
        "figure.facecolor": "#0f1117",
        "axes.facecolor": "#1a1d2e",
        "axes.edgecolor": "#3a3d5c",
        "axes.labelcolor": "#e0e0f0",
        "text.color": "#e0e0f0",
        "xtick.color": "#a0a0c0",
        "ytick.color": "#a0a0c0",
        "grid.color": "#2a2d4a",
        "grid.alpha": 0.5,
        "font.family": "DejaVu Sans",
        "font.size": 11,
        "axes.titlesize": 14,
        "axes.titleweight": "bold",
        "figure.dpi": 150,
    })
    return plt, sns


def plot_01_train_loss(plt, log: dict) -> None:
    """Training loss per step."""
    train_data = log.get("train_loss", [])
    if not train_data:
        print("  [Skip] No training loss data")
        return

    steps = [d["step"] for d in train_data]
    losses = [d["loss"] for d in train_data]

    # Smooth with rolling average
    window = max(1, len(losses) // 20)
    smoothed = []
    for i in range(len(losses)):
        start = max(0, i - window)
        smoothed.append(sum(losses[start:i+1]) / (i - start + 1))

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(steps, losses, color="#4a6fa5", alpha=0.3, linewidth=0.8, label="Raw loss")
    ax.plot(steps, smoothed, color="#7eb8f7", linewidth=2.0, label="Smoothed loss")

    ax.set_title("Training Loss per Step")
    ax.set_xlabel("Training Step")
    ax.set_ylabel("Cross-Entropy Loss")
    ax.legend(facecolor="#1a1d2e", edgecolor="#3a3d5c", labelcolor="#e0e0f0")
    ax.grid(True, linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "01_train_loss_curve.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_02_eval_loss(plt, log: dict) -> None:
    """Eval loss overlaid with train loss."""
    train_data = log.get("train_loss", [])
    eval_data = log.get("eval_loss", [])
    if not eval_data:
        print("  [Skip] No eval loss data")
        return

    fig, ax = plt.subplots(figsize=(10, 5))

    if train_data:
        steps = [d["step"] for d in train_data]
        losses = [d["loss"] for d in train_data]
        window = max(1, len(losses) // 20)
        smoothed = []
        for i in range(len(losses)):
            start = max(0, i - window)
            smoothed.append(sum(losses[start:i+1]) / (i - start + 1))
        ax.plot(steps, smoothed, color="#7eb8f7", linewidth=1.5,
                alpha=0.7, label="Train loss (smoothed)")

    eval_steps = [d["step"] for d in eval_data]
    eval_losses = [d["loss"] for d in eval_data]
    ax.plot(eval_steps, eval_losses, color="#f97b6b", linewidth=2.0,
            marker="o", markersize=5, label="Eval loss")

    ax.set_title("Training vs Evaluation Loss")
    ax.set_xlabel("Training Step")
    ax.set_ylabel("Cross-Entropy Loss")
    ax.legend(facecolor="#1a1d2e", edgecolor="#3a3d5c", labelcolor="#e0e0f0")
    ax.grid(True, linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "02_eval_loss_curve.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_03_perplexity(plt, log: dict) -> None:
    """Perplexity over epochs."""
    eval_data = log.get("eval_loss", [])
    if not eval_data:
        print("  [Skip] No eval data for perplexity")
        return

    epochs = [d["epoch"] for d in eval_data]
    perplexities = [d.get("perplexity", math.exp(min(d["loss"], 20))) for d in eval_data]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(range(len(epochs)), perplexities, color="#a78bfa", linewidth=2.0,
            marker="D", markersize=7, label="Perplexity")
    ax.fill_between(range(len(epochs)), perplexities, alpha=0.15, color="#a78bfa")

    ax.axhline(y=5.0, color="#f97b6b", linestyle="--", alpha=0.7, label="Target (< 5.0)")

    ax.set_title("Perplexity over Training")
    ax.set_xlabel("Evaluation Checkpoint")
    ax.set_ylabel("Perplexity")
    ax.legend(facecolor="#1a1d2e", edgecolor="#3a3d5c", labelcolor="#e0e0f0")
    ax.grid(True, linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "03_perplexity_per_epoch.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_04_rouge(plt, metrics: dict) -> None:
    """ROUGE score bar chart."""
    rouge = metrics.get("rouge", {})
    if not rouge:
        print("  [Skip] No ROUGE data")
        return

    names = ["ROUGE-1", "ROUGE-2", "ROUGE-L"]
    values = [rouge.get("rouge1", 0), rouge.get("rouge2", 0), rouge.get("rougeL", 0)]
    targets = [0.5, 0.25, 0.35]
    colors = ["#7eb8f7", "#a78bfa", "#f97b6b"]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(names, values, color=colors, alpha=0.85, width=0.5)
    ax.bar(names, targets, color=colors, alpha=0.2, width=0.5, label="Target")

    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                f"{val:.3f}", ha="center", va="bottom", fontsize=12, color="#e0e0f0")

    ax.set_ylim(0, 1.0)
    ax.set_title("ROUGE Scores (Post-Training)")
    ax.set_ylabel("F-Measure Score")
    ax.grid(True, axis="y", linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "04_rouge_scores.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_05_bertscore(plt, metrics: dict) -> None:
    """BERTScore F1 distribution histogram."""
    bert = metrics.get("bert_score", {})
    f1_scores = bert.get("per_sample_f1", [])
    if not f1_scores:
        print("  [Skip] No BERTScore per-sample data")
        return

    import numpy as np
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(f1_scores, bins=20, color="#7eb8f7", alpha=0.8, edgecolor="#3a3d5c")
    mean_f1 = float(np.mean(f1_scores))
    ax.axvline(x=mean_f1, color="#f97b6b", linestyle="--", linewidth=2,
               label=f"Mean F1: {mean_f1:.3f}")
    ax.axvline(x=0.80, color="#a78bfa", linestyle="--", linewidth=1.5,
               alpha=0.8, label="Target: 0.80")

    ax.set_title("BERTScore F1 Distribution (Per Sample)")
    ax.set_xlabel("BERTScore F1")
    ax.set_ylabel("Count")
    ax.legend(facecolor="#1a1d2e", edgecolor="#3a3d5c", labelcolor="#e0e0f0")
    ax.grid(True, linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "05_bert_score_distribution.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_06_lr_schedule(plt, log: dict) -> None:
    """Learning rate schedule over steps."""
    train_data = log.get("train_loss", [])
    if not train_data:
        print("  [Skip] No LR data")
        return

    steps = [d["step"] for d in train_data]
    lrs = [d["lr"] for d in train_data]

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(steps, lrs, color="#f0c060", linewidth=2.0)
    ax.fill_between(steps, lrs, alpha=0.15, color="#f0c060")

    ax.set_title("Learning Rate Schedule (Cosine Decay with Warmup)")
    ax.set_xlabel("Training Step")
    ax.set_ylabel("Learning Rate")
    ax.ticklabel_format(style="sci", axis="y", scilimits=(0, 0))
    ax.grid(True, linestyle="--")

    plt.tight_layout()
    out = PLOTS_DIR / "06_learning_rate_schedule.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_07_before_after(plt, metrics: dict) -> None:
    """Sample response quality text comparison panel."""
    samples = metrics.get("generated_samples", [])
    if not samples:
        print("  [Skip] No sample responses")
        return

    fig, axes = plt.subplots(len(samples), 1, figsize=(12, 3 * len(samples)))
    if len(samples) == 1:
        axes = [axes]

    for i, (ax, sample) in enumerate(zip(axes, samples)):
        user = sample.get("user", "")[:80]
        ref = sample.get("reference", "")[:120]
        gen = sample.get("generated", "")[:120]

        text = (
            f"User: {user}\n\n"
            f"Reference: {ref}\n\n"
            f"Generated: {gen}"
        )
        ax.text(0.02, 0.95, text, transform=ax.transAxes,
                verticalalignment="top", wrap=True,
                fontsize=9, color="#e0e0f0",
                bbox=dict(boxstyle="round,pad=0.5", facecolor="#1a1d2e", edgecolor="#3a3d5c"))
        ax.set_title(f"Sample {i+1}", pad=5, fontsize=11)
        ax.axis("off")

    fig.suptitle("Before vs After — Reference vs Generated Responses", fontsize=13, y=1.01)
    plt.tight_layout()
    out = PLOTS_DIR / "07_before_after_comparison.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def plot_summary_card(plt, log: dict, metrics: dict) -> None:
    """Single-page summary dashboard of all key metrics."""
    fig = plt.figure(figsize=(12, 7))
    fig.suptitle("Mythri Fine-Tuning — Results Dashboard", fontsize=16, fontweight="bold", y=0.98)

    # Key numbers
    eval_data = log.get("eval_loss", [])
    final_eval_loss = eval_data[-1]["loss"] if eval_data else None
    final_perplexity = eval_data[-1].get("perplexity") if eval_data else None

    bleu = metrics.get("bleu")
    rouge = metrics.get("rouge", {})
    bert_f1 = metrics.get("bert_score", {}).get("f1")
    knowledge = metrics.get("knowledge_retention", {}).get("score")
    train_time = log.get("training_time_seconds", 0)

    metric_pairs = [
        ("Eval Loss", f"{final_eval_loss:.4f}" if final_eval_loss else "N/A", "#7eb8f7"),
        ("Perplexity", f"{final_perplexity:.2f}" if final_perplexity else "N/A", "#a78bfa"),
        ("BLEU", f"{bleu:.4f}" if bleu else "N/A", "#f97b6b"),
        ("ROUGE-L", f"{rouge.get('rougeL', 0):.4f}" if rouge else "N/A", "#7eb8f7"),
        ("BERTScore F1", f"{bert_f1:.4f}" if bert_f1 else "N/A", "#a78bfa"),
        ("Knowledge Ret.", f"{knowledge*100:.1f}%" if knowledge else "N/A", "#f0c060"),
        ("Train Time", f"{train_time/60:.1f} min", "#60c090"),
    ]

    for i, (name, value, color) in enumerate(metric_pairs):
        x = (i % 4) * 0.25 + 0.12
        y = 0.72 - (i // 4) * 0.35

        ax = fig.add_axes([x, y, 0.18, 0.22])
        ax.set_facecolor("#1a1d2e")
        for spine in ax.spines.values():
            spine.set_edgecolor(color)
            spine.set_linewidth(2)
        ax.set_xticks([])
        ax.set_yticks([])

        ax.text(0.5, 0.65, value, ha="center", va="center",
                fontsize=18, fontweight="bold", color=color, transform=ax.transAxes)
        ax.text(0.5, 0.2, name, ha="center", va="center",
                fontsize=9, color="#a0a0c0", transform=ax.transAxes)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    out = PLOTS_DIR / "00_summary_dashboard.png"
    plt.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {out.name}")


def main():
    print("=" * 60)
    print("Generating All Training & Evaluation Plots")
    print("=" * 60)

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns

    setup_style()

    training_log = load_json(TRAINING_LOG)
    eval_metrics = load_json(EVAL_METRICS)

    if not training_log and not eval_metrics:
        print("\n[ERROR] No results found. Run training and evaluation first:")
        print("  python finetuning/02_train.py")
        print("  python finetuning/03_evaluate.py")
        sys.exit(1)

    print("\nGenerating plots...")
    plot_01_train_loss(plt, training_log)
    plot_02_eval_loss(plt, training_log)
    plot_03_perplexity(plt, training_log)
    plot_04_rouge(plt, eval_metrics)
    plot_05_bertscore(plt, eval_metrics)
    plot_06_lr_schedule(plt, training_log)
    plot_07_before_after(plt, eval_metrics)
    plot_summary_card(plt, training_log, eval_metrics)

    print(f"\n{'='*60}")
    print(f"ALL PLOTS SAVED to: {PLOTS_DIR}")
    print(f"{'='*60}")
    for p in sorted(PLOTS_DIR.glob("*.png")):
        print(f"  {p.name}")


if __name__ == "__main__":
    main()
