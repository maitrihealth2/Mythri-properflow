# 🌿 Maitri (Mythri) — AI Mental Health Companion

Welcome to **Maitri** (also known as Mythri), an advanced, empathy-driven AI mental health companion. This repository contains the complete full-stack architecture, combining a highly interactive Next.js frontend with a powerful, multi-agent FastAPI backend.

---

## 📖 Product Walkthrough

Maitri is designed to replicate the nuances of a real therapy session through a seamless, voice-first interface. Here is the user journey:

### 1. Onboarding & Authentication
Users are greeted with a calming, minimalist interface (strict adherence to "Absolute minimalism and calm. No glassmorphism or blurs."). Authentication is handled securely via Firebase.

### 2. The Dashboard
Upon logging in, users access their personal dashboard where they can:
- View past session transcripts and emotional trajectories.
- Start a new real-time consultation.
- Access telemetry data for debugging and system transparency.

### 3. The Consultation Interface
This is the core of the Maitri experience.
- **`<Mitra />` 3D Avatar:** A React Three Fiber-powered visual avatar that gives the AI a calming, interactive presence.
- **Voice-First Interaction:** Users can speak naturally into their microphone. The audio is streamed in real-time using WebSockets, transcribed instantly, and the AI replies with natural, emotionally-aware voice synthesis.
- **Fallback Chat:** A seamless text-chat fallback is available for users who prefer typing.

### 4. Post-Session Analysis
Behind the scenes, Maitri analyzes the emotional arc of the session, stores the conversational state in a PostgreSQL/SQLite database, and flags any potential crisis situations for human review.

---

## ⚙️ Core Integrations & Architecture

Maitri operates on a decoupled architecture, ensuring that heavy machine learning workloads do not block the frontend user experience.

### 1. Frontend ↔ Backend (Next.js & FastAPI)
- **REST APIs:** Used for authentication, session history, and fetching telemetry data.
- **WebSockets (`/api/voice/stream`):** Used for low-latency, bi-directional audio streaming. The Next.js frontend captures raw microphone data (Web Audio API) and streams it to the backend.

### 2. Backend ↔ AI Providers (Sarvam & OpenAI)
- **Speech-to-Text (STT) & Text-to-Speech (TTS):** The backend utilizes **Sarvam AI**. FFmpeg chunks and decodes the audio stream, sending it to Sarvam for highly accurate transcription and realistic voice generation.
- **The Dual-Agent Brain:** Text is sent to a multi-agent system powered by **OpenAI**. 
  - *Brain 1 (Dialogue State Analyst):* Evaluates user intent and checks for ambiguity.
  - *Brain 2 (Maitri Responder):* Synthesizes the final empathetic response based on clinical guidelines.

### 3. Backend ↔ Local ML Models
- **Emotion Engine:** Utterances are passed through a local HuggingFace pipeline (`SamLowe/roberta-base-go_emotions`) to gauge the user's real-time emotional state.
- **Retrieval-Augmented Generation (RAG):** Using a local **ChromaDB** instance and `all-MiniLM-L6-v2` embeddings, the system retrieves structured clinical theories (CBT, DBT) from the `knowledge/` directory to ground the AI's responses in proven therapeutic frameworks.

---

## 💻 Environments & Setup (Windows PowerShell)

You will need two distinct environment files for the two systems.

### 1. Backend (`backend/.env`)
```properties
SARVAM_API_KEY=your_key_from_dashboard.sarvam.ai
DATABASE_URL=sqlite:///./mindbridge.db
SECRET_KEY=anyrandomstring123
```
*Setup Command:*
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Frontend (`frontend/.env.local`)
```properties
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
# Other Firebase variables as needed
```
*Setup Command:*
```powershell
cd frontend
npm install
```

---

## ▶️ How to Run Locally

The application consists of two servers running simultaneously. 

**Terminal 1 — Backend:**
We use a custom Python watcher to smoothly reload the server on code changes and handle graceful database teardowns.
```powershell
cd backend
.\venv\Scripts\activate
python run_dev.py
```
*Access:* The backend API and Swagger Docs run on **http://localhost:8000/docs**

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
*Access:* The Next.js web application is available at **http://localhost:3000**

---

## 🧪 Testing the System

1. **Verify Backend Startup:** When you run `python run_dev.py`, ensure the terminal outputs `[Info] RAG ChromaDB found...`. Look for the `Uvicorn running on http://0.0.0.0:8000` confirmation.
2. **Verify Frontend Next.js:** Ensure the app compiles successfully.
3. **Verify Local Emotion Model:** Send a test message in the chat UI. Observe the backend terminal; you should see a log like `[Local HF Emotion] Detected 'confusion' (0.49)`.

---

## 🎯 Next Steps & Roadmap

1. **Initialize the Knowledge Base (RAG):** Ingest clinical documents into the ChromaDB vector store so Maitri can fetch grounded therapeutic advice.
2. **Supervised Fine-Tuning (SFT):** Curate conversational datasets in `training/datasets/finetuning_datasets/` to eventually run LoRA tuning on `sarvam-30b` or `qwen3`.
3. **End-to-End Voice Validation:** Test the full WebSocket pipeline from the React Three Fiber Avatar to the Sarvam endpoints.

---

## 📂 Codebase Directory Mapping (Quick Links)

Navigate the codebase quickly using these links to the core architecture files:

### 🌐 Frontend (Next.js)
- **App Entry Point:** [`frontend/app/layout.tsx`](./frontend/app/layout.tsx)
- **Consultation UI:** [`frontend/modules/dashboard/frontend/page.tsx`](./frontend/modules/dashboard/frontend/page.tsx)

### 🧠 Backend (FastAPI)
- **Server Entry / Dev Watcher:** [`backend/run_dev.py`](./backend/run_dev.py)
- **Consultation API & Core Logic:** [`backend/modules/consultation/api.py`](./backend/modules/consultation/api.py)
- **Crisis Handler:** [`backend/security/crisis_handler.py`](./backend/security/crisis_handler.py)

### 🤖 AI Brains & Integrations
- **AI Dual-Agent Analyst:** [`backend/rag/brain/analyst.py`](./backend/rag/brain/analyst.py)
- **Emotion Detector (HuggingFace):** [`backend/rag/brain/emotion_detector.py`](./backend/rag/brain/emotion_detector.py)
- **RAG ChromaDB Retriever:** [`backend/rag/knowledge/retriever.py`](./backend/rag/knowledge/retriever.py)
- **Sarvam AI STT/TTS Client:** [`backend/providers/sarvam/sarvam_client.py`](./backend/providers/sarvam/sarvam_client.py)

---

*Maitri — Designing the future of empathetic AI.*