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

- **Real-Time Voice Pipeline:** Deep integration with Sarvam AI for high-accuracy Speech-to-Text (STT) and emotionally expressive Text-to-Speech (TTS). Includes advanced, language-aware text chunking to ensure natural pitch and cadence for dense regional scripts (Telugu, Tamil, Hindi).
- **Contextual AI Engine:** An advanced LLM system with an underlying Neural Analyst, designed to evaluate conversation history, detect emotional shifts, and provide therapeutic responses.
- **Emotion & Crisis Detection:** Real-time analysis using local HuggingFace transformers pipelines to gauge the user's emotional state and instantly flag high-risk phrases.
- **Interactive Modern UI:** A calming, responsive frontend built with Next.js 16, React 19, and Tailwind CSS. Features a dynamic, **circular radial audio spectrum visualizer** that reacts perfectly symmetrically to voice frequencies.
- **Interactive Exercises:** Automated pop-up exercises (Box Breathing, Grounding, Reflection) that perfectly synchronize with the AI's response generation to provide immediate, actionable relief during crisis or high stress.
- **Enhanced Languaging:** Highly tuned regional prompts to ensure a natural conversational tone (e.g., proper Hinglish blending) and suppress melodramatic or overly sad biases in Telugu and Tamil.
- **Robust Backend & Telemetry:** A high-performance FastAPI Python backend managing JWT authentication, Server-Sent Events (SSE) for live telemetry, and an HTML-based live architecture visualizer that routes packets in real-time.
- **Windows-Optimized Reloading:** Backend utilizes `nodemon` to completely bypass native Windows/Uvicorn signal crashing, ensuring stable hot-reloading even with heavy local PyTorch processes.
---

## 📂 File & Folder Tree

```text
mindbridge/
│
├── backend/
│   ├── app.py                        ← FastAPI entry point
│   ├── requirements.txt              ← Python packages
│   ├── .env                          ← API keys
│   │
│   ├── api/
│   │   ├── auth.py                   ← Register / Login / JWT routes
│   │   ├── consultation.py           ← Chat / Session / History routes
│   │   ├── voice.py                  ← Voice pipeline routes
│   │   ├── streaming.py              ← Streaming responses
│   │   └── telemetry.py              ← SSE live telemetry feed
│   │
│   ├── ai_engine/
│   │   ├── sarvam_client.py          ← Sarvam AI (LLM) integration
│   │   ├── voice_client.py           ← Text chunking & translation layer
│   │   ├── analyst.py                ← Neural Analyst context engine
│   │   └── emotion_detector.py       ← Local HuggingFace sentiment pipeline
│   │
│   ├── db/
│   │   └── models.py                 ← SQLAlchemy DB models + init
│   │
│   └── services/
│       ├── auth.py                   ← Password hashing + JWT utils
│       └── crisis_handler.py         ← Safety / crisis detection
│
├── frontend/
│   ├── package.json                  ← Next.js dependencies
│   ├── .env.local                    ← NEXT_PUBLIC_API_URL
│   │
│   ├── lib/
│   │   └── api.ts                    ← API wrapper functions
│   │
│   └── app/
│       ├── voice/page.tsx            ← Voice Chat with radial visualizer
│       ├── consultation/page.tsx     ← Text Chat mode
│       └── history/page.tsx          ← Session history + transcripts
│
└── architecture_flow.html            ← Live system architecture visualizer
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
To view the live telemetry architecture board: **Open `architecture_flow.html` in your browser.**

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