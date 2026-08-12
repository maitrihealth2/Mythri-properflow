import os
from dotenv import load_dotenv
import requests

load_dotenv("backend/.env")
hf_token = os.getenv("HF_TOKEN")

headers = {"Authorization": f"Bearer {hf_token}"}
url = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"

res = requests.post(url, headers=headers, json={"inputs": ["This is a test"]})
print(f"Status: {res.status_code}")
print(f"Body: {res.text}")
