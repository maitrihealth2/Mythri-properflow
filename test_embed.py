import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
load_dotenv("backend/.env.local", override=True)

from backend.rag.knowledge.builder import RequestsHuggingFaceEmbeddingFunction

hf_token = os.getenv("HF_TOKEN")
print(f"HF_TOKEN length: {len(hf_token) if hf_token else 0}")

embedding_fn = RequestsHuggingFaceEmbeddingFunction(
    api_key=hf_token,
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    api_url="https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
)

try:
    print("Requesting embedding...")
    embeddings = embedding_fn(["This is a test"])
    print("Success! Dimensions:", len(embeddings[0]))
except Exception as e:
    import traceback
    traceback.print_exc()
