"""
RAG Retriever
Given a user message, retrieves the most relevant therapy knowledge chunks
from ChromaDB and returns them as context for the LLM.
"""

import os

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge", "chroma_db")
COLLECTION_NAME = "therapy_knowledge"

_client = None
_collection = None


def get_collection():
    """Lazy-load ChromaDB collection (singleton)."""
    global _client, _collection
    if _collection is None:
        import chromadb
        from chromadb.config import Settings
        _client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        from chromadb.utils import embedding_functions
        embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _collection = _client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_fn,
        )
    return _collection


def retrieve_context(query: str, n_results: int = 3) -> str:
    """
    Retrieve the top-n most relevant therapy knowledge chunks for a query.
    Returns a formatted string ready to inject into the LLM prompt.
    """
    try:
        collection = get_collection()
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
        )
        chunks = results["documents"][0]
        sources = [m["source"] for m in results["metadatas"][0]]

        if not chunks:
            return ""

        context_parts = []
        for chunk, source in zip(chunks, sources):
            context_parts.append(f"[{source.upper()}]\n{chunk}")

        return "\n\n".join(context_parts)

    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return ""


def is_knowledge_base_ready() -> bool:
    """Check if ChromaDB has been populated by inspecting the database file, without loading SentenceTransformer."""
    try:
        sqlite_file = os.path.join(CHROMA_DIR, "chroma.sqlite3")
        return os.path.exists(sqlite_file) and os.path.getsize(sqlite_file) > 1024
    except Exception:
        return False