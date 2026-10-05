# MYTHRI AI — PHASE 2 / BATCH 1 SCOPE & ISSUE AUDIT

This document establishes the official scope analysis for **PHASE 2 / BATCH 1 (Security + Data Protection)**.

---

## 1. Scope Boundary Principles

Batch 1 focuses strictly on:
1. Authentication and session security fixes achievable without architectural migration.
2. Secret and configuration exposure prevention.
3. Sensitive-data exposure mitigation across logs, exports, and errors.
4. Local authorization and access-control gaps.
5. Safe security defaults.
6. Input-boundary validation and prompt injection hardening.
7. Local data-protection hardening without changing memory, RAG, or AI models.

**Excluded & Deferred from Batch 1:**
- Full architectural authentication migration (e.g. replacing frontend `localStorage` tokens with complete HttpOnly cookie flows requiring state machine changes).
- External emergency dispatch / clinician handoff integrations.
- Durable background worker lifecycle management & scheduled data retention daemons.
- Startup `init_db()` removal & Alembic gate migrations.
- Route parameter contract refactoring (e.g., migrating session token query params across all API endpoints).
- Database table partitioning.

---

## 2. Comprehensive Phase 2 Issue Analysis

| Issue | Vulnerability | Affected Component | Batch 1? | Reason | Risk |
|:---|:---|:---|:---:|:---|:---:|
| **P0-02** | Access tokens stored in `localStorage` | `frontend/`, `backend/security/` | **NO (Deferred)** | Requires coordinated frontend/backend architectural auth overhaul and session state redesign. Defer to Phase 3/4. | Low (Deferred) |
| **P0-05** | Client IP used for rate limiting spoofable | `backend/core/middleware/security.py` | **YES** | Can be resolved locally by strictly sanitizing reverse proxy headers (`CF-Connecting-IP`, `X-Forwarded-For`) and enforcing TrustedHost. | Low |
| **P0-08** | Crisis handling lacks 3rd-party emergency handoff | `backend/security/crisis_handler.py` | **NO (Deferred)** | Requires external clinician/dispatch API integration, legal compliance workflows, and product design. Defer to Phase 3. | Medium (Deferred) |
| **P0-09** | Sensitive clinical data exposed in admin APIs/exports | `backend/modules/admin/api.py` | **YES** | Local PII scrubbing and field minimization in admin endpoints and CSV exports preserves privacy without altering AI pipelines. | Low |
| **P0-10** | No automated data-retention/deletion lifecycle worker | `backend/core/database/` | **NO (Deferred)** | Requires durable queue/cron architecture and soft/hard deletion data policies. Defer to Phase 3/4. | Medium (Deferred) |
| **P1-05** | Schema synchronization relies on `init_db()` | `backend/core/database/models.py` | **NO (Deferred)** | Removing `init_db()` requires formal CI/CD Alembic runner gating. Defer to Phase 3/4. | Medium (Deferred) |
| **P1-24** | Admin endpoints lack privileged session controls | `backend/modules/admin/api.py` | **YES** | Enforcing strict `require_admin` dependency and revoked JTI checking is local and safe. | Low |
| **P1-28** | Registration transaction rollback on partial failure | `backend/security/authentication/api.py` | **YES** | Wrapping user creation and refresh token issuance in strict atomic rollback blocks prevents dirty database states. | Low |
| **P1-33** | Audit logs expose raw client IP & sensitive params | `backend/core/middleware/audit.py` | **YES** | IP pseudonymization (SHA-256 HMAC/hash) and sensitive URL query parameter scrubbing can be implemented locally. | Low |
| **P1-36** | Telemetry endpoints allow general access tokens | `backend/modules/dashboard/api.py` | **YES** | Restricting SSE telemetry streams to verified `admin` role prevents unauthorized observation. | Low |
| **P1-41** | Session token route parameter migration to UUID | `backend/modules/consultation/api.py` | **NO (Deferred)** | Modifying API parameter schemas breaks frontend API contracts without architectural coordinated release. Defer to Phase 3. | High (Deferred) |
| **P1-44** | UTC timezone standardization in DB models | `backend/core/database/models.py` | **YES** | Standardizing on timezone-aware UTC datetime defaults (`func.now()` / `DateTime(timezone=True)`) is verified and safe. | Low |
| **P2-06** | Insecure cookie flags / token storage defaults | `backend/security/authentication/api.py` | **YES** | Enforce `httponly=True`, `secure=True`, `samesite="lax"` on refresh token cookies. | Low |
| **P2-12** | Sensitive data in logs / exception disclosure | `backend/core/middleware/audit.py`, `backend/modules/admin/api.py` | **YES** | Ensure stack traces are hidden from clients and error messages avoid disclosing credentials or secrets. | Low |
| **P2-30** | Input boundary PromptGuard domain enforcement | `backend/security/prompt_guard.py` | **YES** | Strengthen regex boundaries and token delimiters without altering AI response generation. | Low |
| **P2-33** | Database table partitioning | `backend/core/database/` | **NO (Deferred)** | Database table partitioning requires production migration scripts and database maintenance windows. Defer to Phase 4. | High (Deferred) |
| **P3-08** | Alembic migration version gate | `backend/alembic/` | **NO (Deferred)** | CI/CD pipeline and deployment gating belong to Phase 4. | Low (Deferred) |

---

## 3. Approved Batch 1 Remediation Candidates

The following 8 items are selected and approved for Phase 2 / Batch 1 implementation:
1. **P1-36 & P1-24**: Telemetry & Admin Authorization Lockdown (`backend/modules/dashboard/api.py`, `backend/modules/admin/api.py`).
2. **P0-09 & P2-12**: Clinical & Personal Data Scrubbing in Admin Inspections & Exports (`backend/modules/admin/api.py`).
3. **P1-33**: Audit Log IP Pseudonymization & Sensitive Query Parameter Redaction (`backend/core/middleware/audit.py`).
4. **P0-05**: Strict Client IP Header Sanitization (`backend/core/middleware/security.py`).
5. **P1-28**: User Registration & Auth Transaction Rollback Resilience (`backend/security/authentication/api.py`).
6. **P2-06**: Refresh Token Cookie Security Defaults (`backend/security/authentication/api.py`).
7. **P2-30**: PromptGuard Boundary Hardening (`backend/security/prompt_guard.py`).
8. **P1-44**: UTC Timezone Consistency Verification (`backend/core/database/models.py`).
