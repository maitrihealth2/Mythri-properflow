"""
export_to_rag_docs.py
Converts parsed document chunks (raw_chunks.jsonl) into
knowledge/docs/*.txt files so the RAG loader picks them up.

Run once:
  python finetuning/export_to_rag_docs.py
Then:
  python -m knowledge.loader
"""
import json
import pathlib

CHUNKS_PATH = pathlib.Path(__file__).resolve().parent / "data" / "raw_chunks.jsonl"
DOCS_DIR = pathlib.Path(__file__).resolve().parent.parent / "knowledge" / "docs"
DOCS_DIR.mkdir(exist_ok=True)

def main():
    if not CHUNKS_PATH.exists():
        print(f"[ERROR] {CHUNKS_PATH} not found. Run 00_parse_documents.py first.")
        return

    chunks = []
    with open(CHUNKS_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    # Group by source
    by_source: dict[str, list[str]] = {}
    for chunk in chunks:
        src = chunk["source"]
        by_source.setdefault(src, []).append(
            f"[{chunk['domain'].upper()}]\n{chunk['chunk']}"
        )

    # Write one .txt per source document
    file_map = {
        "therapy_pdf": "knowledge1_therapy.txt",
        "psychodynamic_docx": "psychodynamic_theory_full.txt",
    }

    for src, texts in by_source.items():
        filename = file_map.get(src, f"{src}.txt")
        out_path = DOCS_DIR / filename
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n\n---\n\n".join(texts))
        print(f"  Exported {len(texts)} chunks -> {out_path.name}")

    print(f"\n[DONE] Exported {len(chunks)} chunks to {DOCS_DIR}")
    print("Now run: python -m knowledge.loader")

if __name__ == "__main__":
    main()
