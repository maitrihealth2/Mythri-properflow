"""
Multi-Format RAG Retriever
Given a user message, retrieves the most relevant therapy knowledge chunks
from ChromaDB and returns them as context for the LLM.
"""

import os
import pathlib as _pl
from dotenv import load_dotenv

_BASE = _pl.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "therapy_knowledge_v2"

_client = None
_collection = None


def get_collection():
    """Lazy-load ChromaDB collection (singleton)."""
    global _client, _collection
    if _collection is None:
        try:
            import chromadb
            from chromadb.config import Settings
            _client = chromadb.PersistentClient(
                path=CHROMA_DIR,
                settings=Settings(anonymized_telemetry=False)
            )
            nv_key = os.getenv("NVIDIA_API_KEY")
            if not nv_key:
                raise ValueError("NVIDIA_API_KEY is missing for embeddings")
                
            class NvidiaEmbeddingFunction(chromadb.utils.embedding_functions.EmbeddingFunction):
                def __call__(self, input):
                    import requests
                    res = requests.post(
                        "https://integrate.api.nvidia.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {nv_key}", "Content-Type": "application/json"},
                        json={"model": "nvidia/nv-embedqa-e5-v5", "input": input, "input_type": "query", "encoding_format": "float", "truncate": "END"}
                    )
                    res.raise_for_status()
                    return [x["embedding"] for x in res.json()["data"]]
                    
            embedding_fn = NvidiaEmbeddingFunction()
            
            _collection = _client.get_collection(
                name=COLLECTION_NAME,
                embedding_function=embedding_fn,
            )
        except Exception as e:
            print(f"[RAG] Initialization failed gracefully: {e}")
            _collection = None
    return _collection


def retrieve_context(query: str, n_results: int = 3) -> str:
    """
    Retrieve the top-n most relevant therapy knowledge chunks for a query.
    Returns a formatted string ready to inject into the LLM prompt.
    """
    collection = get_collection()
    if not collection:
        return ""
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
        )
        chunks = results["documents"][0]
        sources = [m["source"] for m in results["metadatas"][0]]
        concepts = [m.get("concept", "clinical_knowledge") for m in results["metadatas"][0]]

        if not chunks:
            return ""

        context_parts = []
        for chunk, source, concept in zip(chunks, sources, concepts):
            context_parts.append(f"[SOURCE: {source.upper()} | TOPIC: {concept.upper()}]\n{chunk}")

        return "\n\n".join(context_parts)

    except Exception as e:
        print(f"Multi-format RAG retrieval error: {e}")
        return ""


def is_knowledge_base_ready() -> bool:
    """Check if ChromaDB has been populated by inspecting the database file."""
    try:
        sqlite_file = os.path.join(CHROMA_DIR, "chroma.sqlite3")
        return os.path.exists(sqlite_file) and os.path.getsize(sqlite_file) > 1024
    except Exception:
        return False
