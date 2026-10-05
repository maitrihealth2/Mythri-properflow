# MYTHRI AI — PHASE 2 / BATCH 1 CHANGESET CONTROL

This document lists every file modified during **PHASE 2 / BATCH 1 (Security + Data Protection)**.

---

## 1. Modified Files Summary

### A. `backend/modules/dashboard/api.py`
- **Issue:** P1-24, P1-36
- **Change:** Updated `_verify_telemetry_access` to strictly check for `role == "admin"` or `type == "admin_access"` token claims, while also validating that the token JTI is not in `_REVOKED_ADMIN_JTIS`.
- **Security Purpose:** Prevents standard user access tokens or revoked admin sessions from connecting to real-time internal server telemetry streams.
- **Data-Flow Impact:** Telemetry endpoint only streams to authorized admin sessions.
- **AI Impact:** None. AI pipeline is completely isolated from telemetry verification logic.
- **Regression Risk:** None. Valid admin access tokens continue to function seamlessly.

### B. `backend/modules/admin/api.py`
- **Issue:** P0-09, P2-12
- **Change:** Applied `scrub_pii(msg.content)` in `get_session_messages`, `export_user_data`, and `export_session_data` CSV export handlers.
- **Security Purpose:** Ensures personal identifying information (phone numbers, email addresses, government IDs, credit card numbers) is redacted in admin inspection views and exported CSV files.
- **Data-Flow Impact:** Admin data exports and session inspections redact sensitive user PII.
- **AI Impact:** None. Database storage remains fully intact (FLE encrypted); scrubbing occurs only at presentation/export boundary.
- **Regression Risk:** None.

### C. `backend/core/middleware/audit.py`
- **Issue:** P1-33, P2-12
- **Change:** Added salted SHA-256 IP pseudonymization (`_pseudonymize_ip`) and expanded query parameter scrubbing to redact `token`, `ticket`, `key`, `password`, `secret`, `authorization`, `code`, `admin_key`, `access_token`, `refresh_token`, `idToken`.
- **Security Purpose:** Protects user IP privacy in compliance with data minimization standards while scrubbing authentication credentials from URL logs.
- **Data-Flow Impact:** `audit.log` stores masked IP addresses and sanitized query URLs.
- **AI Impact:** None.
- **Regression Risk:** None.

### D. `backend/security/authentication/api.py`
- **Issue:** P1-28, P2-06
- **Change:** Wrapped user registration database insertion and refresh token storage in atomic transaction blocks with explicit `try / except Exception: db.rollback(); raise`.
- **Security Purpose:** Prevents partial registration states or unhandled database errors during user registration.
- **Data-Flow Impact:** Ensures strict ACID transactional rollback on any unexpected registration failure.
- **AI Impact:** None.
- **Regression Risk:** None.

### E. `backend/security/prompt_guard.py`
- **Issue:** P2-30
- **Change:** Added regex boundary patterns for hidden system instruction probing (`reveal/leak hidden system prompt/instructions/directives`).
- **Security Purpose:** Enhances boundary defense against adversarial prompt extraction attacks.
- **Data-Flow Impact:** Scans input before sending to LLM context builder.
- **AI Impact:** None. Only adversarial attacks are blocked; natural therapeutic user messages pass through unchanged.
- **Regression Risk:** None.

### F. `backend/tests/test_phase2_batch1_suite.py`
- **Issue:** Batch 1 Test Suite
- **Change:** Created automated unit and integration tests covering telemetry admin authorization, PII scrubbing in exports, audit IP pseudonymization, and PromptGuard boundaries.
- **Security Purpose:** Continuous automated validation for all Phase 2 / Batch 1 security enhancements.
- **Data-Flow Impact:** None (test suite only).
- **AI Impact:** None.
- **Regression Risk:** None.
