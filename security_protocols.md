# Mythri AI Security Protocols

This document outlines the core security protocols and data leak prevention strategies for the Mythri AI platform.

## 1. Identity & Access Management (IAM)
- **Protocol:** JWT (JSON Web Tokens) with Firebase Auth & OAuth 2.0.
- **Why:** Prevents session hijacking and ensures a user can only access their own `Session`, `UserPersonaProfile`, and `UserJournal` data.

## 2. Encryption In-Transit & At-Rest
- **Protocol (In-Transit):** TLS 1.3 & WSS (Secure WebSockets).
- **Protocol (At-Rest):** Database disk encryption.
- **Why:** Protects highly sensitive voice data and chat logs from network sniffing and server compromises.

## 3. Data Leak Prevention (The 3 Pillars)

### A. The Database Layer: Field-Level Encryption (FLE)
- **Action:** Implement Application-Level AES Encryption on Django models.
- **Why:** Before a journal entry or chat message is saved, the backend scrambles the text using a secret master key. If a hacker steals the `db.sqlite3` or Postgres database, they only see encrypted gibberish.

### B. The AI Layer: Local PII Scrubbing
- **Action:** Integrate a local data masking pipeline (e.g., Microsoft Presidio) before external API calls.
- **Why:** Scrubs names, locations, and phone numbers from user prompts before sending them to the Sarvam AI API for STT, LLM, or TTS. This ensures the 3rd-party provider never receives the user's actual identity.

### C. The API Layer: Strict IDOR Protection
- **Action:** Implement strict security middleware in FastAPI and Django.
- **Why:** Every request must check the Firebase JWT token and ensure the extracted `user_id` strictly matches the owner of the requested data. This prevents Insecure Direct Object Reference (IDOR) attacks where a user tries to access another user's private data.

## 4. Rate Limiting & API Abuse Protection
- **Protocol:** Token Bucket Algorithm (via FastAPI `slowapi`).
- **Why:** Prevents malicious actors from spamming expensive AI API calls (STT, LLM, TTS) and mitigates DDoS attacks.

## 5. Role-Based Access Control (RBAC)
- **Protocol:** Principle of Least Privilege in the Django Admin.
- **Why:** Ensures developers and staff only see aggregate or de-identified data. Strict user groups (SuperAdmin, Analyst, Clinician) are required.

## 6. Strict Frontend Web Security
- **Protocol:** CSP (Content Security Policy) and HSTS.
- **Why:** Configured in Next.js headers to prevent Cross-Site Scripting (XSS).

## 7. Immutable Audit Trails
- **Protocol:** Append-only Logging.
- **Why:** Database entries in the `RiskLog` must never be altered or deleted, ensuring a tamper-proof log for forensic review if a crisis event occurs.
