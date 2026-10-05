# MYTHRI AI — PHASE 1 BASELINE REPORT

**Date:** 2026-10-05  
**System:** Mythri AI by Affyne Labs  
**Baseline Version:** 3.0.0  

---

## 1. Current System Architecture

```
+-------------------------------------------------------------------------+
|                              FRONTEND LAYER                             |
|  - Next.js 14 / React 18 (App Router + Strict Mode)                     |
|  - Contexts: AuthContext, FeatureFlagContext                            |
|  - Transport: Axios HTTP Client (30s Timeout) + WebSocket Streaming     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           SECURITY & MIDDLEWARE                         |
|  - TrustedHostMiddleware (Strict Domain Allowlist)                      |
|  - CORSMiddleware (Explicit Whitelisted Origins)                        |
|  - ThreatSentinel (Sliding-Window IP/User Rate Limiter & Quarantine)   |
|  - Native JWT Authentication (HMAC-SHA256 with iss & aud verification)  |
|  - Request Correlation ID (X-Correlation-ID Binding)                   |
|  - PII Scrubber & Sanitized 500 Error Shield                            |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        CONSULTATION & AI PIPELINE                       |
|  1. Deterministic Crisis Engine (Word-boundary regex + Helplines)      |
|  2. Turn Complexity Classifier (TRIVIAL / CASUAL / MEANINGFUL)          |
|  3. Pre-Inference PromptGuard (Sync Jailbreak & Out-of-Domain Gate)     |
|  4. Emotion Detection (Local RoBERTa GoEmotions / Heuristic Fallback)   |
|  5. CRSE Context Selection & Unified Cognitive Profile Builder          |
|  6. RAG Knowledge Lookup (ChromaDB + all-MiniLM-L6-v2 Embeddings)       |
|  7. Neural Dialogue Analyst (Phase Selection via Sarvam 105B @ 0.3)     |
|  8. Support Router (TALK / GROUND / PROPOSE_EXERCISE / ESCALATE)        |
|  9. Maitri Generator (Sarvam 105B / NVIDIA NIM Fallback)               |
| 10. Post-Processing (Exercise Tag Extraction & PII Output Scrub)        |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           PERSISTENCE & STORAGE                         |
|  - SQLAlchemy 2.0 ORM with Single Shared Connection Pool                |
|  - Database: PostgreSQL (Neon PgBouncer) / Local SQLite                 |
|  - Field-Level Encryption (AES-256-GCM via EncryptedText Type)          |
|  - Tables: users, sessions, messages, refresh_tokens, companion_memories|
+-------------------------------------------------------------------------+
```

---

## 2. End-to-End Data Flows

### A. Text Conversation Flow
1. **Client Submission:** User submits message string via `POST /api/consultation/message`.
2. **Security & Gate:** `ThreatSentinel` verifies IP/token limits $\rightarrow$ `check_for_crisis()` evaluates deterministic risk $\rightarrow$ `TurnComplexity` gates downstream AI pipeline.
3. **Context & RAG:** Gathers past 30 messages $\rightarrow$ Queries ChromaDB knowledge base if non-trivial $\rightarrow$ Classifies emotion via RoBERTa.
4. **Analyst Phase:** Determines dialogue phase (`[PHASE: COMFORT]`, `[PHASE: PROBE_SINGLE]`).
5. **Generation & Persistence:** Sarvam 105B streams response with XML delimiter isolation $\rightarrow$ Extracts `[EXERCISE: <TYPE>]` tags $\rightarrow$ Writes encrypted record to `messages` table.

### B. Voice Conversation Flow
1. **Ticket Exchange:** Client requests 30s single-use ticket via `POST /api/auth/ws-ticket`.
2. **WebSocket Handshake:** Client connects to `/api/streaming/ws/stream?ticket=<ticket>`.
3. **STT Streaming:** Sarvam Saaras v3 transcribes live PCM audio chunks.
4. **LLM Generation:** Consultation pipeline generates response text.
5. **TTS Streaming:** Sarvam Bulbul converts text into streaming audio chunks returned to UI.

### C. Session Lifecycle Flow
- **Creation (`POST /api/consultation/start`):** Validates auth $\rightarrow$ Generates session token $\rightarrow$ Initializes `StateTracker` $\rightarrow$ Constructs dynamic personalized greeting from prior session summary.
- **Termination (`POST /api/consultation/{session_id}/close`):** Validates session ownership $\rightarrow$ Marks session inactive $\rightarrow$ Spawns background summary task.

---

## 3. Functional Baseline & Verification Status

* **Unit Security Suite ([`test_security_suite.py`](file:///d:/Copy/V5(frontend)/backend/tests/test_security_suite.py)):** **15/15 PASSED** (0.36s)
* **Red-Team Security Simulation ([`red_team_simulation.py`](file:///d:/Copy/V5(frontend)/backend/tests/red_team_simulation.py)):** **6/6 PASSED** (0.06s)
* **Database & ORM Layer:** SQLAlchemy composite indexes active; query duration listener active.
* **Knowledge Store:** ChromaDB `therapy_knowledge_v2` operational.

---

## 4. Current Pre-Existing Technical Debt & Known Limitations

1. **In-Process State:** `StateTracker` dialogue phases reside in worker memory (deferred to Redis migration in Phase 3).
2. **Local Token Storage:** JWT access tokens reside in `localStorage` (deferred to HttpOnly cookie migration in Phase 4).
3. **FastAPI BackgroundTasks:** Memory synthesis uses non-durable in-process threads (deferred to Celery queue in Phase 5).
