"""
Knowledge Base Loader
Reads therapy documents, chunks them, embeds with sentence-transformers,
and stores in ChromaDB vector database.

Run once: python -m knowledge.loader
Then RAG retriever can query it on every chat request.
"""

import os
import json
import chromadb
from chromadb.utils import embedding_functions

DOCS_DIR = os.path.join(os.path.dirname(__file__), "docs")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "therapy_knowledge"
CHUNK_SIZE = 400       # characters per chunk
CHUNK_OVERLAP = 80     # overlap between chunks


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def load_documents() -> list[dict]:
    """Load structured JSON files and plain text / markdown files from docs/ folder."""
    documents = []
    
    if not os.path.exists(DOCS_DIR):
        os.makedirs(DOCS_DIR)
        
    for root, _, files in os.walk(DOCS_DIR):
        for filename in files:
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, DOCS_DIR)
            source_name = os.path.splitext(filename)[0]
            
            # Skip transcripts, fine-tuning, or chroma_db folders
            if "transcripts" in root or "finetuning" in root or "chroma_db" in root:
                continue
                
            if filename.endswith(".json"):
                with open(filepath, "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                        if isinstance(data, list):
                            for idx, chunk in enumerate(data):
                                documents.append({
                                    "id": chunk.get("id", f"{source_name}_{idx}"),
                                    "text": chunk.get("text", ""),
                                    "source": source_name,
                                    "concept": chunk.get("concept", "general"),
                                    "technique": chunk.get("technique", "none")
                                })
                            print(f"  📄 {rel_path} → {len(data)} structured JSON chunks")
                    except json.JSONDecodeError:
                        print(f"  ❌ Error parsing {rel_path}")

            elif filename.endswith(".txt") or filename.endswith(".md"):
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    chunks = chunk_text(content)
                    for idx, chunk in enumerate(chunks):
                        documents.append({
                            "id": f"{source_name}_chunk_{idx}",
                            "text": chunk,
                            "source": source_name,
                            "concept": source_name,
                            "technique": "general_theory"
                        })
                    print(f"  📄 {rel_path} → {len(chunks)} text/markdown chunks")
                    
    return documents


import sys, shutil
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def build_knowledge_base():
    """Embed all documents and store in ChromaDB."""
    print("\n[RAG] Building MindBridge Knowledge Base...")
    print(f"   Source: {DOCS_DIR}")
    print(f"   Store:  {CHROMA_DIR}\n")

    # Load documents
    documents = load_documents()
    print(f"\n[RAG] Total chunks loaded: {len(documents)}")

    # Clean stale/corrupt database folder before opening client connection
    if os.path.exists(CHROMA_DIR):
        try:
            shutil.rmtree(CHROMA_DIR)
            print("[RAG] Cleared previous ChromaDB directory")
        except Exception as e:
            print(f"[RAG] Directory reset note: {e}")

    # Use sentence-transformers for embeddings (free, local)
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=CHROMA_DIR,
        settings=Settings(anonymized_telemetry=False)
    )
    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )

    # Clear existing documents if rebuilding
    try:
        existing_ids = collection.get()["ids"]
        if existing_ids:
            collection.delete(ids=existing_ids)
            print(f"[RAG] Cleared {len(existing_ids)} existing chunks")
    except Exception as e:
        print(f"[RAG] Collection clear warning: {e}")

    # Add in batches
    batch_size = 50
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        collection.add(
            ids=[d["id"] for d in batch],
            documents=[d["text"] for d in batch],
            metadatas=[{"source": d["source"], "concept": d["concept"], "technique": d["technique"]} for d in batch],
        )

    print(f"[RAG] Knowledge base built: {collection.count()} chunks stored")
    print(f"   Location: {CHROMA_DIR}")
    return collection


if __name__ == "__main__":
    build_knowledge_base()
    print("\n[RAG] Done! Knowledge base is ready.")