# Remaining Weekly Plan Tasks

**Date**: 23 August 2026
**Status**: P0 (Must Work) Backend Integration Complete. Moving to Edge Cases, Content, and Polish.

The core MVP backend loop (Understand → Decide → Act → Measure → Remember) is fully operational. 
The following 5 major problem areas from the original weekly plan are what remains to be completed:

### 1. Conversational Onboarding (Not Started)
- **Current State:** The system gracefully handles new users (as proven by the dynamic new session greeting), but the actual intake questionnaire is mocked.
- **Action Required:** Build the conversational flow where Mythri dynamically interviews the user to build their initial psychological profile.

### 2. Voice Pipeline Stress Testing (Pending)
- **Current State:** Backend routes and STT/TTS classes are verified (smoke tested).
- **Action Required:** Validate under real conditions. Conduct stress testing of the WebSocket connection with a real frontend client streaming actual audio bytes to ensure latency and chunking are acceptable.

### 3. Crisis Handoff Path (Pending)
- **Current State:** Safety validator is integrated, asynchronous, and correctly logs `[OUTPUT_SAFETY_VIOLATION]`.
- **Action Required:** Verify end-to-end handoff. Build the logic to detect severe self-harm, interrupt the standard chat loop, and route the user to a crisis hotline or human agent.

### 4. Clinical RAG Knowledge Base Ingestion (Pending)
- **Current State:** The RAG retrieval mechanism works flawlessly (verified 7/7 queries).
- **Action Required:** Fully ingest the actual clinical guidelines, therapy manuals, and curated exercise content into the ChromaDB vector store (currently relying on existing test data).

### 5. Performance Bottlenecks & Caching (Pending)
- **Current State:** Safety evaluation was made asynchronous to unblock the chat, but full load testing is incomplete.
- **Action Required:** Perform rigorous load testing and implement advanced caching layers (P2 requirements) to ensure stability at scale.
