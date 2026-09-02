# 🌿 Mythri — AI Mental Health Companion
### *Built by Affyne Labs*

Welcome to **Mythri**, an advanced, empathy-driven AI mental health companion created by **Affyne Labs**. This repository contains the complete full-stack architecture, combining a highly interactive Next.js frontend with a powerful, multi-agent FastAPI backend.

---

## 🏢 About Affyne Labs

Mythri is a product of **Affyne Labs** — a team building the next generation of empathetic AI systems that prioritise human wellbeing, cultural awareness, and responsible AI design.

**Contact:** hello@affynelabs.com  
**Website:** https://affynelabs.com

---

## 📖 Product Walkthrough

Mythri is designed to replicate the nuances of a real support session through a seamless, voice-first interface. Here is the user journey:

### 1. Onboarding & Authentication
Users are greeted with a calming, minimalist interface. Authentication is handled securely via Firebase and JWT tokens.

### 2. The Sanctuary Dashboard
Upon logging in, users access their personal Sanctuary where they can:
- View today's emotional snapshot and wellness streak.
- Start a new real-time consultation via voice or text.
- Access past session transcripts and reflections.

### 3. The Consultation Interface
This is the core of the Mythri experience.
- **Voice-First Interaction:** Users speak naturally into their microphone. The audio is processed using Sarvam AI STT, the AI replies with natural, emotionally-aware voice synthesis.
- **Text Chat Fallback:** A seamless text-chat interface is always available.
- **Multi-bubble Responses:** Mythri responds in natural paragraph bubbles, animated word-by-word for a human feel.

### 4. Post-Session Analysis
Behind the scenes, Mythri analyses the emotional arc of the session, stores the conversational state in PostgreSQL, and flags any potential crisis situations for human review.

---

## ⚙️ Core Integrations & Architecture

Mythri operates on a decoupled architecture, ensuring heavy ML workloads do not block the frontend user experience.

### 1. Frontend ↔ Backend (Next.js & FastAPI)
- **REST APIs + NDJSON Streaming:** Used for authentication, session history, and real-time AI response streaming.
- **WebSockets (`/api/consultation/ws/events`):** Used for proactive typing indicators and push notifications.

### 2. Backend ↔ AI Providers (Sarvam & OpenAI)
- **Speech-to-Text (STT) & Text-to-Speech (TTS):** The backend utilises **Sarvam AI** for highly accurate transcription and realistic voice generation.
- **The Dual-Agent Brain:** Text is sent to a multi-agent system:
  - *Dialogue State Analyst:* Evaluates user intent and checks for ambiguity.
  - *Mythri Responder:* Synthesises the final empathetic response based on clinical guidelines.

### 3. Backend ↔ Local ML Models
- **Emotion Engine:** Utterances are passed through a local HuggingFace pipeline (`SamLowe/roberta-base-go_emotions`) to gauge the user's real-time emotional state.
- **Retrieval-Augmented Generation (RAG):** Using a local **ChromaDB** instance and `all-MiniLM-L6-v2` embeddings, the system retrieves structured clinical theories (CBT, DBT) from the `knowledge/` directory to ground the AI's responses in proven therapeutic frameworks.

---

## 💻 Environments & Setup (Windows PowerShell)

### 1. Backend (`backend/.env`)
```properties
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SECRET_KEY=anyrandomstring123
SARVAM_API_KEY=your_key_from_dashboard.sarvam.ai
OPENAI_API_KEY=your_openai_key
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

**Terminal 1 — Backend:**
```powershell
cd backend
.\venv\Scripts\activate
python run_dev.py
```
*Access:* API + Swagger Docs → **http://localhost:8000/docs**

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
*Access:* Web app → **http://localhost:3000**

---

## 🧪 Testing the System

1. **Verify Backend:** Ensure the terminal outputs `[RAG] Knowledge base loaded` and `Uvicorn running on http://0.0.0.0:8000`.
2. **Verify Frontend:** Ensure Next.js compiles successfully.
3. **Verify Emotion Model:** Send a test message in the chat UI and observe the backend terminal for `[Local HF Emotion] Detected '...'`.

---

## 🎯 Roadmap

1. **Knowledge Base (RAG):** Ingest additional clinical documents into ChromaDB.
2. **Prompt Caching:** Implement Anthropic/OpenAI prefix caching to reduce input token costs.
3. **Fine-Tuning (SFT):** Curate conversational datasets in `training/` for LoRA tuning on `sarvam-30b`.

---

## 📂 Codebase Quick Links

### 🌐 Frontend (Next.js)
- **App Entry Point:** [`frontend/app/layout.tsx`](./frontend/app/layout.tsx)
- **Text Chat UI:** [`frontend/modules/consultation/frontend/page.tsx`](./frontend/modules/consultation/frontend/page.tsx)
- **Voice Chat UI:** [`frontend/modules/voice/frontend/page.tsx`](./frontend/modules/voice/frontend/page.tsx)
- **API Client:** [`frontend/core/api.ts`](./frontend/core/api.ts)

### 🧠 Backend (FastAPI)
- **Server Entry / Dev Watcher:** [`backend/run_dev.py`](./backend/run_dev.py)
- **FastAPI App:** [`backend/app.py`](./backend/app.py)
- **Consultation API & Core Logic:** [`backend/modules/consultation/api.py`](./backend/modules/consultation/api.py)
- **Voice API:** [`backend/modules/voice/api.py`](./backend/modules/voice/api.py)
- **Crisis Handler:** [`backend/security/crisis_handler.py`](./backend/security/crisis_handler.py)

### 🤖 AI Brains & Integrations
- **AI Dual-Agent Analyst:** [`backend/rag/brain/analyst.py`](./backend/rag/brain/analyst.py)
- **Emotion Detector (HuggingFace):** [`backend/rag/brain/emotion_detector.py`](./backend/rag/brain/emotion_detector.py)
- **RAG ChromaDB Retriever:** [`backend/rag/knowledge/retriever.py`](./backend/rag/knowledge/retriever.py)
- **Sarvam AI STT/TTS Client:** [`backend/providers/sarvam/sarvam_client.py`](./backend/providers/sarvam/sarvam_client.py)

---

## 📄 Legal

- [Privacy Policy](./PRIVACY_POLICY.md)
- [Security Protocols](./security_protocols.md)

---

*Mythri — Designing the future of empathetic AI.*  
*© 2026 Affyne Labs. All rights reserved.*