# 🌿 Mythri — Technical Architecture & Developer Guide

This document serves as the core technical manual for the Mythri AI mental health companion repository. It details the internal functionalities, the modular domain-driven architecture, and provides a strict mapping of where to find and modify specific logic.

---

## ⚙️ Core Functionalities & How They Work

The system is built on a highly decoupled FastAPI backend and a Next.js frontend, utilizing advanced AI streaming pipelines. Here is a breakdown of the core functionalities:

- **Real-Time Voice & Streaming Pipeline:** 
  - **How it works:** The Next.js frontend captures microphone audio using the Web Audio API and streams it via WebSockets. The FastAPI backend receives this stream, transcodes it to 16kHz Mono WAV using `FFmpeg` subprocesses, and sends it to the Sarvam API for highly accurate Speech-to-Text (STT). The generated text response is then pushed to the Sarvam TTS API, and the resulting audio chunks are streamed back to the frontend via Server-Sent Events (SSE).
- **Dual-Agent Meta-Cognitive Architecture:** 
  - **How it works:** Input text first routes to a **Dialogue State Analyst (Brain 1)** which evaluates the user's intent and selects a clinical phase (e.g., active listening, cognitive reframing). These instructions are then passed to the **Maitri Responder (Brain 2)**, which synthesizes the final empathetic response, ensuring the AI strictly adheres to therapeutic boundaries.
- **Retrieval-Augmented Generation (RAG):** 
  - **How it works:** Utilizing `FAISS` and `all-MiniLM-L6-v2` embeddings, the system retrieves structured clinical theories and psychological data from the `knowledge/` directory during a session, injecting them into the LLM context to ground the AI's advice in established therapy frameworks.
- **Cross-Session Memory Tracking:** 
  - **How it works:** Interactions are logged to a PostgreSQL/SQLite database (`NeonDB`). Before generating a response, the backend queries the database for past context, loading a persistent user persona so the AI "remembers" emotional shifts and risk metrics across multiple sessions.
- **Emotion Engine & Crisis Checking:** 
  - **How it works:** Utterances run through a local HuggingFace transformers pipeline (`SamLowe/roberta-base-go_emotions`) to gauge real-time emotional state. Simultaneously, a deterministic, fast-scan regex engine checks for self-harm triggers, overriding the LLM to instantly inject safety protocols and helpline resources if risk is detected.
- **Interactive UI & Live Telemetry:** 
  - **How it works:** The Next.js frontend features a dynamic, circular radial audio spectrum visualizer that reacts symmetrically to voice frequencies. Furthermore, a Live Telemetry board (`telemetry.html`) connects to the backend SSE stream, parsing `broadcast_event` packets to visually animate data routing (RAG fetches, Memory loads, Emotion tracking) in real-time.
- **Firebase Auth Integration:** 
  - **How it works:** Secure JWT token handling and persistent user identity management is backed by a full Firebase integration, integrated natively into both the Next.js client and FastAPI middleware.

---

## 📂 Comprehensive File Index & Architecture Guide

The codebase follows a Modular Domain-Driven Architecture. Below is an exhaustive index of every core file in the repository, explaining exactly what it contains, why it exists, and its functional role. Click on any directory to expand its contents.

<details>
<summary><b>🛠 Root & Deployment Files</b></summary>
<ul>
  <li><code>deployment/docker/docker-compose.prod.yml</code>: Production Docker configuration orchestrating backend, frontend, and databases.</li>
  <li><code>deployment/nginx/nginx.conf</code>: NGINX configuration for routing traffic and handling SSL/WebSocket reverse proxying.</li>
  <li><code>deployment/render/render.yaml</code>: Infrastructure-as-code for deploying the application on Render.</li>
  <li><code>deployment/scripts/setup_windows.ps1</code>: Automated PowerShell script for developers to rapidly initialize virtual environments and npm dependencies.</li>
  <li><code>project_structure.md</code>: Legacy architectural blueprint document.</li>
  <li><code>.gitignore</code>: Standard git ignore paths protecting `.env`, API keys, `__pycache__`, `node_modules`, and the `fareed_logs` cache.</li>
</ul>
</details>

<details>
<summary><b>⚙️ Backend — Core Operations (<code>backend/core/</code>)</b></summary>
<ul>
  <li><code>brain/analyst.py</code>: The <b>Brain 1</b> Neural Analyst. Analyzes the current dialogue state and outputs a strict clinical phase instruction.</li>
  <li><code>brain/emotion_detector.py</code>: Local HF pipeline (`roberta-base-go_emotions`). Scores incoming text against emotional labels to track affective shifts.</li>
  <li><code>brain/pattern_analyzer.py</code>: Detects long-term behavioral patterns to inject into the user persona.</li>
  <li><code>brain/state_tracker.py</code>: Manages the short-term working memory of the conversation.</li>
  <li><code>database/models.py</code>: SQLAlchemy ORM definitions (Users, Sessions, Messages, Feedback) defining the Postgres schemas.</li>
  <li><code>database/alembic.ini</code> & <code>alembic/env.py</code>: Alembic database migration tools for schema versioning.</li>
  <li><code>logger/terminal.py</code>: Custom colorized console logger for debugging and SSE telemetry piping.</li>
  <li><code>security/crisis_handler.py</code>: High-priority, deterministic regex engine. Scans all input for self-harm/crisis markers to immediately trigger safety overrides.</li>
</ul>
</details>

<details>
<summary><b>🔌 Backend — Domain Modules (<code>backend/modules/</code>)</b></summary>
<ul>
  <li><code>authentication/api.py & service.py</code>: API endpoints and logic for JWT token issuance, login, and registration.</li>
  <li><code>consultation/api.py</code>: Handles text-based chat. Chains the RAG, Emotion, and dual-brain LLM calls to return textual therapy responses.</li>
  <li><code>dashboard/api.py</code>: Exposes internal telemetry via SSE (Server-Sent Events) for the live visualizer.</li>
  <li><code>feedback/api.py</code>: Endpoints to ingest user ratings/feedback on specific AI responses for future tuning.</li>
  <li><code>knowledge/builder.py & retriever.py</code>: Logic to ingest `.txt/.pdf` clinical documents, embed them into ChromaDB, and retrieve relevant chunks via similarity search.</li>
  <li><code>profile/service.py</code>: Manages CRUD operations for the user's persistent persona and settings.</li>
  <li><code>voice/api.py & api_streaming.py</code>: Highly complex audio chunking pipelines. Receives WebSockets, proxies to Sarvam STT, routes to LLM, proxies to Sarvam TTS, and streams back byte chunks.</li>
  <li><code>voice/stt_batcher.py & vocal_engine.py</code>: Optimizes batch audio transcription and tweaks vocal prosody (pitch/speed) before playback.</li>
</ul>
</details>

<details>
<summary><b>🌐 Backend — External Providers (<code>backend/providers/</code>)</b></summary>
<ul>
  <li><code>firebase/firebase_rest.py</code>: Wraps the Firebase Admin SDK to handle decoupled cloud authentication verifying.</li>
  <li><code>sarvam/sarvam_client.py</code>: The core LLM API client interfacing with `sarvam-105b` for localized response generation.</li>
  <li><code>sarvam/voice_client.py</code>: Specialized STT/TTS API client handling specific transliteration and regional language constraints.</li>
</ul>
</details>

<details>
<summary><b>🧠 Backend — Fine-Tuning Pipeline (<code>training/</code>)</b></summary>
<ul>
  <li><code>datasets/finetuning_datasets/</code>: Contains raw `.jsonl` conversational extracts (`analyst_sft_dataset`, `maitri_sft_dataset`).</li>
  <li><code>finetuning/prepare_finetuning_dataset.py</code>: Extracts structured DB conversations and formats them into exact SFT instruction-response pairs for open-source model training.</li>
  <li><code>backend/finetuning/00_parse_documents.py</code> to <code>05_inference_test.py</code>: End-to-end local training pipeline scripts for scraping data, executing LoRA/QLoRA tuning, plotting loss curves, and testing the tuned model.</li>
  <li><code>backend/finetuning/Maitri_Sarvam30B_Colab.ipynb</code>: Google Colab notebook for running the training pipeline on cloud A100 GPUs.</li>
</ul>
</details>

<details>
<summary><b>🖥️ Frontend — Pages & UI (<code>frontend/app/</code> & <code>modules/</code>)</b></summary>
<ul>
  <li><code>frontend/app/voice-chat/page.tsx</code>: Main entry for the immersive, hands-free voice experience with the radial audio visualizer.</li>
  <li><code>frontend/app/text-chat/page.tsx</code>: Standard text consultation UI.</li>
  <li><code>frontend/app/history/page.tsx & profile/page.tsx</code>: Views for reviewing past transcripts and updating persona settings.</li>
  <li><code>frontend/app/login/page.tsx</code>: Firebase/JWT authentication entry screen.</li>
  <li><code>frontend/app/layout.tsx & globals.css</code>: Global Next.js root layout and Tailwind CSS entry point.</li>
  <li><code>frontend/modules/*/frontend/page.tsx</code>: Co-located module frontend code strictly isolated by domain (Auth, Voice, Dashboard, etc.).</li>
</ul>
</details>

<details>
<summary><b>🧩 Frontend — Core Logic & Shared Components (<code>frontend/core/</code> & <code>shared/</code>)</b></summary>
<ul>
  <li><code>frontend/core/api.ts</code>: Axios HTTP client wrapper with robust retry and error handling.</li>
  <li><code>frontend/core/firebase.ts</code>: Firebase client initialization for the browser.</li>
  <li><code>frontend/core/providers.tsx</code>: React Context providers wrapping the app (Auth, Theme).</li>
  <li><code>frontend/shared/components/BottomNav.tsx & TopNav.tsx</code>: Standardized application shell navigation.</li>
  <li><code>frontend/shared/components/ExerciseOverlay.tsx</code>: Renders the clinical pop-ups (Breathing/Grounding exercises) when triggered by the AI.</li>
  <li><code>frontend/shared/stores/mitraStore.ts</code>: Zustand global state management for the Companion state.</li>
  <li><code>frontend/shared/hooks/</code>: Custom React hooks for DOM tracking (`useDOMTerrain`), emotion metrics (`useEmotionalDecay`), and memory (`useMemorySystem`).</li>
</ul>
</details>

<details>
<summary><b>✨ Frontend — The Mitra Companion Avatar (<code>frontend/shared/components/Mitra/</code> & <code>companion/</code>)</b></summary>
<p><i>The virtual avatar requires a massive internal engine to feel "alive". These files handle its simulation:</i></p>
<ul>
  <li><code>core/CompanionEngine.ts & StateMachine.ts</code>: The central tick-loop brain orchestrating the avatar's current physical state (Idle, Listening, Talking).</li>
  <li><code>render/MitraCharacter.tsx & AnimationController.ts</code>: Three.js/React Three Fiber code to render the `.glb` mesh and blend skeletal animations.</li>
  <li><code>animation/blinking.ts, breathing.ts, sleeping.ts, walking.ts</code>: Procedural animation math to generate lifelike micro-movements outside of baked loops.</li>
  <li><code>systems/EmotionSystem.ts & FriendshipSystem.ts</code>: Modifies the avatar's posture and glowing particle effects based on the user's current crisis/anxiety levels.</li>
  <li><code>systems/CursorTracker.ts & headTracking.ts</code>: Raycasting logic allowing the avatar's head and eyes to physically follow the user's mouse cursor across the screen.</li>
  <li><code>interactions/SpeechBubble.tsx & WaveInteraction.ts</code>: UI overlays allowing the avatar to physically react (wave, run over) to user clicks.</li>
  <li><code>attention/AttentionSystem.ts & scheduler/BehaviorScheduler.ts</code>: A priority queue ensuring the avatar doesn't rapidly swap between conflicting animations (e.g., trying to sleep while talking).</li>
</ul>
</details>

<details>
<summary><b>📁 Frontend — Static Assets (<code>frontend/public/</code>)</b></summary>
<ul>
  <li><code>telemetry.html</code>: The live SVG architecture visualizer that connects to the FastAPI SSE backend.</li>
  <li><code>models/Meshy_AI_Character_output.glb</code>: The compiled 3D mesh for the Mitra companion.</li>
  <li><code>desktop_bg.webm & mobile_bg.webm</code>: Animated looping backgrounds for the UI.</li>
</ul>
</details>

---

## 💻 Setup (Windows PowerShell)

### Step 1 — Backend
```powershell
cd backend
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
cd frontend
npm install
```

---

## ▶️ Run the Application

**Terminal 1 — Backend:**
```powershell
cd backend
.\venv\Scripts\activate
# We use nodemon to securely hot-reload the server on Windows and bypass Uvicorn crash bugs
npx nodemon --watch core --watch modules --watch providers -e py --exec "uvicorn app:app --port 8000"
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

### Access Points
- **Main Web Interface:** Open your browser and navigate to **http://localhost:3000**
- **Live Telemetry Dashboard:** Open your browser and navigate to **http://localhost:3000/telemetry.html**

---

## ⚠️ Important Notes

- `backend\.env` must exist with your Sarvam API key before starting.
- If you need to reset the SQLite database during development: `del backend\mindbridge.db` then restart the uvicorn server.