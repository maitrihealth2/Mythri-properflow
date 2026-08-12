import os
from dotenv import load_dotenv
import requests

load_dotenv("backend/.env")
hf_token = os.getenv("HF_TOKEN")

headers = {"Authorization": f"Bearer {hf_token}"}
urls = [
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
]

for url in urls:
    try:
        print(f"Trying {url}...")
        res = requests.post(url, headers=headers, json={"inputs": ["This is a test"]})
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Success, dimensions: {len(data[0])}")
    except Exception as e:
        print(f"Failed: {e}")
