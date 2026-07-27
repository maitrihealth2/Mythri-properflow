# 🌿 Mythri

<p align="center">
  <i>An AI-powered, empathetic mental health companion.</i>
</p>

---

## 🌟 What is Mythri?
Mythri is an advanced, multilingual AI mental health companion designed to provide accessible, empathetic, and culturally aware psychological support. Powered by Sarvam AI, Mythri engages with users through natural voice and text conversations, making mental wellness support conversational and inclusive.

## 🎯 What Problem It Solves
Accessing mental health care is often hindered by stigma, high costs, and a lack of culturally relevant resources. Mythri bridges this gap by offering:

- **Instant Accessibility:** 24/7 on-demand mental health support without waiting for appointments.
- **Linguistic Inclusivity:** Overcoming language barriers by supporting regional languages and accents natively, fostering a deeper sense of connection.
- **Safety First:** Real-time crisis detection algorithms to identify when a user is in danger and seamlessly provide helpline resources.
- **Stigma-Free Environment:** A private, non-judgmental space where users can safely voice their thoughts and process emotions.

## 🚀 What's Built So Far
Mythri currently features a robust, modern architecture with a full end-to-end pipeline:

- **Modular Domain-Driven Architecture:** Codebase has been fully refactored into distinct modules, providers, and core logic, ensuring scalable and decoupled components for both frontend and backend.
- **Real-Time Voice Pipeline:** Deep integration with Sarvam AI for high-accuracy Speech-to-Text (STT) and emotionally expressive Text-to-Speech (TTS). Includes advanced, language-aware text chunking to ensure natural pitch and cadence for dense regional scripts (Telugu, Tamil, Hindi).
- **Dual-Agent Meta-Cognitive Architecture:** An advanced AI pipeline utilizing a Neural Analyst for dynamic clinical phase selection and a Maitri Responder for empathetic response generation.
- **RAG Knowledge Retrieval:** Integrates local ChromaDB and `all-MiniLM-L6-v2` embeddings for retrieving structured psychological data and clinical theories during sessions.
- **Cross-Session Memory Tracking:** Working memory and persistent persona state tracking to monitor the user's emotional shifts and risk metrics across multiple consultation sessions.
- **Emotion & Crisis Detection:** Real-time analysis using local HuggingFace transformers pipelines (`SamLowe/roberta-base-go_emotions`) to gauge emotional state, combined with deterministic, fast-scan rules for instantaneous crisis detection and safety overriding.
- **Interactive Modern UI:** A calming, responsive frontend built with Next.js 16, React 19, and Tailwind CSS. Features a dynamic, **circular radial audio spectrum visualizer** that reacts perfectly symmetrically to voice frequencies.
- **Interactive Exercises:** Automated pop-up exercises (Box Breathing, Grounding, Reflection) that perfectly synchronize with the AI's response generation to provide immediate, actionable relief during crisis or high stress.
- **Firebase Auth Integration:** Full Firebase-backed authentication system for secure and persistent user identity management.
- **Robust Backend & Telemetry:** A high-performance FastAPI Python backend managing SSE for live telemetry, paired with an HTML-based live architecture visualizer that maps and animates data flows (Voice, Text, RAG, Memory, Emotion) in real-time.
- **Windows-Optimized Reloading:** Backend utilizes `nodemon` to completely bypass native Windows/Uvicorn signal crashing, ensuring stable hot-reloading even with heavy local PyTorch processes.
- **Fine-Tuning Readiness:** Complete `finetuning` pipeline built-in for Supervised Fine-Tuning (SFT) and dataset preparation for future open-weights model integrations.
---

## 📂 File & Folder Tree

```text
mindbridge/
│
├── backend/
│   ├── app.py                        ← FastAPI entry point
│   ├── requirements.txt              ← Python packages
│   ├── .env                          ← Environment & API keys
│   │
│   ├── core/                         ← Core System Infrastructure
│   │   ├── brain/                    ← AI Brain & Prompt generation logic
│   │   ├── database/                 ← Database connections & ORM logic
│   │   ├── logger/                   ← System logging & debugging
│   │   └── security/                 ← Auth and JWT/Firebase security
│   │
│   ├── modules/                      ← Domain-Driven API Modules
│   │   ├── authentication/           ← User login/signup routes
│   │   ├── consultation/             ← Text chat and crisis triggers
│   │   ├── dashboard/                ← Analytics and live metrics
│   │   ├── feedback/                 ← User rating collection
│   │   ├── knowledge/                ← Data structuring routes
│   │   ├── profile/                  ← User profile management
│   │   └── voice/                    ← Streaming voice routes & pipelines
│   │
│   ├── providers/                    ← External Services Integration
│   │   ├── firebase/                 ← Firebase connection handling
│   │   └── sarvam/                   ← Sarvam LLM, STT, and TTS clients
│   │
│   ├── memory/                       ← Cross-session state and persona tracking
│   ├── rag/                          ← Retrieval-Augmented Generation & FAISS
│   └── finetuning/                   ← Dataset generation and SFT pipelines
│
└── frontend/
    ├── package.json                  ← Next.js dependencies
    ├── .env.local                    ← NEXT_PUBLIC_API_URL
    │
    ├── app/                          ← Next.js App Router (Pages & Layouts)
    │   ├── voice/                    ← Voice consultation interface
    │   ├── consultation/             ← Text consultation interface
    │   └── auth/                     ← Authentication screens
    │
    ├── core/                         ← Global providers, store, and config
    ├── modules/                      ← Feature-specific React components
    ├── shared/                       ← Reusable UI elements (buttons, inputs)
    └── public/                       ← Static assets
        └── telemetry.html            ← Live system architecture visualizer
```

---

## 💻 Setup (Windows PowerShell)

### Step 1 — Backend
```powershell
cd mindbridge\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2 — Create `backend\.env`
```properties
SARVAM_API_KEY=your_key_from_dashboard.sarvam.ai
DATABASE_URL=sqlite:///./mindbridge.db
SECRET_KEY=anyrandomstring123
```

### Step 3 — Frontend
```powershell
cd mindbridge\frontend
npm install
```

---

## ▶️ Run the Application

**Terminal 1 — Backend:**
```powershell
cd mindbridge\backend
.\venv\Scripts\activate
# We use nodemon to securely hot-reload the server on Windows and bypass Uvicorn crash bugs
npx nodemon --watch api --watch ai_engine --watch db -e py --exec "uvicorn app:app --port 8000"
```

**Terminal 2 — Frontend:**
```powershell
cd mindbridge\frontend
npm run dev
```

Open your browser and navigate to: **http://localhost:3000**
To view the live telemetry architecture board: **Navigate to `http://localhost:3000/telemetry.html` in your browser.**

---

## ⚠️ Important Notes

- `backend\.env` must exist with your Sarvam API key before starting.
- If you need to reset the DB: `del mindbridge\backend\mindbridge.db` then restart the uvicorn server.

---

## 🤝 Academic Collaboration
Mythri is actively seeking collaboration with psychology researchers and clinical professionals for:

- Psychologically validated conversation corpus in Telugu, Tamil, Hindi and English
- ICMR compliance guidance for mental health data handling
- Clinical review of crisis detection and escalation protocols
- Joint research publications on AI-assisted mental health support in India

If you are a researcher, psychologist, or institution interested in building responsible mental health AI for India — reach out at yugavardhank@gmail.com