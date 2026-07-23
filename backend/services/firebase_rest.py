import os
import pathlib
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local", override=True)

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")

class FirebaseClient:
    def __init__(self, api_key: str = FIREBASE_API_KEY):
        self.api_key = api_key
        self.base_url = "https://identitytoolkit.googleapis.com/v1/accounts"

    async def register(self, email: str, password: str):
        url = f"{self.base_url}:signUp?key={self.api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            data = response.json()
            if not response.is_success:
                error_msg = data.get("error", {}).get("message", "Registration failed")
                raise HTTPException(status_code=400, detail=f"Firebase Error: {error_msg}")
            return data

    async def login(self, email: str, password: str):
        url = f"{self.base_url}:signInWithPassword?key={self.api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            data = response.json()
            if not response.is_success:
                error_msg = data.get("error", {}).get("message", "Authentication failed")
                raise HTTPException(status_code=401, detail=f"Firebase Error: {error_msg}")
            return data

firebase_client = FirebaseClient()
