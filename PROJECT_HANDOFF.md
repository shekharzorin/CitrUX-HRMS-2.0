# Citrux HRMS — Session Handoff Document

_Generated at the end of the Security Hardening sprint. Repo: `CitrUX-HRMS-2.0` (push target: remote `v2`). Branch `main`, HEAD `6d77b94`._

---

## 1. Current Project Status

Multi-tenant HRMS (React + TypeScript / Node + Express + Prisma + PostgreSQL + Redis + BullMQ). Broad and largely functional: **60 Prisma models, ~36 API route groups, ~45 UI pages**. Infrastructure is strong (RBAC v2, feature flags, tenant scoping, audit logging, Socket.IO, AI provider abstraction).

This session delivered two large workstreams:
- **Attendance Management Framework** — built from design through five functional method slices + an admin console.
- **Security Hardening (Phase A + Phase B)** — closed credential/PII serializer leaks and two Critical tenant-isolation/permission bypasses; expanded audit logging; added regression tests.

**Overall completion: ~68%.** **Production Readiness (security axis): ~76/100** (up from 64 at sprint start). Payroll has **not** been started and is the gating workstream.

---

## 2. Modules Completed (status by domain)

| Domain | Status | Notes |
|---|---|---|
| Auth / RBAC / Multi-tenancy | Mostly Complete (~88–96%) | RBAC v2 (AccessRole + permissions, dual-read cache); reset flow + rate limiting solid; **no session revocation yet** |
| Attendance Framework | Mostly Complete (~86%) | Manual, CSV, GPS, Geofencing, Selfie, Evidence, Admin Console all live; biometric config-only |
| Support Desk | Mostly Complete (~88%) | Full ticket lifecycle + AI routing; activity timeline endpoint **fixed this session** |
| Leave | Mostly Complete (~82%) | Types/balances/accrual/approvals/encashment/year-end; approvals now audited |
| Documents | Mostly Complete (~75%) | Categories + expiry + access control; delete destroys Cloudinary file |
| Notifications | Mostly Complete (~80%) | In-app + email (nodemailer) + realtime; no SMS/push |
| Reporting/Analytics | Partial (~55%) | Dashboards + CSV reports; no scheduled reports |
| Assets | Partial (~60%) | Registry + assignment (now audited); no formal return/audit workflow |
| **Payroll** | **Partial (~60%) — NOT STARTED this session** | Engine + statutory references + payslip worker exist; needs build/hardening |
| Shift | Partial (~50%) | Definitions + assignment (now audited); no rostering |
| Recruitment | Partial/Prototype (~40%) | Job postings + applications; no pipeline/offers |
| Performance | Partial/Prototype (~40%) | Goals + reviews; no cycles/360 |
| Integrations | Prototype/Missing (~25%) | Email only; no SMS/webhooks/biometric ingestion |

---

## 3. Security Hardening Work Completed

**Phase A — `549a858` (serializer + audit)**
- Root cause: ~17 endpoints serialized the full `User` relation via `include:{user...}`, leaking `passwordHash`/`resetToken`/`refreshToken`/`email` **and** Profile PII (**bank account, IFSC, Aadhaar, PAN, UAN, addresses, DOB**) — e.g. a manager fetching team leave requests received subordinates' bank/government-ID data.
- New `server/src/utils/safe-select.ts`: `userSafeSelect` (display-only, no secrets/email/PII), `userSafeSelectWithEmail` (admin/manager lists that show email), `userAuthSelect` (companyId+managerId for server-side checks only).
- Swept 15 controllers; AI digest no longer emails PII to the LLM.
- Audit logging added: leave approve/reject + encashment, expense approve/reject, asset assign/return, timesheet approve, attendance adjustment, payslip download.

**Phase B Batch 1 — `0cff84c` (tenant isolation + permissions)**
- **Bulk employee import** was callable by *any* authenticated user and created users with **no `companyId`** → now `requirePermission('MANAGE_USERS')` + always scoped to `req.user.companyId` + audited.
- **Offboarding** `getResignations` returned all tenants' records; status-update/terminate lacked company checks → now `getTenantScope`-scoped + `assertSameCompany` + audited.

**Phase B Batch 2 — `6d77b94` (high-priority hardening)**
- **Support Desk activity timeline** endpoint added (was 404) with employee-safe event filtering — **verified live: 200**.
- **Upload hardening**: `uploadRateLimiter` (30/min); 10 MB cap + image/PDF MIME allowlist on the previously-unbounded generic upload; per-tenant Cloudinary subfolders.
- **Orphan cleanup**: selfie re-capture deletes the replaced Cloudinary image (document delete already destroyed its file).
- **Audit coverage**: document update/verify, shift assign/bulk.

**Regression guards (no-DB source-scan + unit tests)**
- `serializer-guard` — fails if any controller reintroduces a full-User include.
- `audit-coverage` — sensitive mutations must reference AuditService + entity types.
- `tenant-isolation` — import companyId scoping + offboarding tenant scoping.
- `permission-guard` — curated sensitive routes must carry a guard; import requires `MANAGE_USERS`.
- `support-visibility` — employee serializer drops INTERNAL/ADMIN_ONLY comments + agent internals.
- `safe-select` — whitelists exclude all secrets/PII.

---

## 4. Attendance Completion Status (~86%)

**Functional methods (end-to-end):**
- **Manual entry** — admin/HR records a day → event → projection. (`feat(attendance)` slices)
- **CSV import** — preview + idempotent import.
- **Mobile GPS check-in** — employee self check-in; accuracy + geofence validation.
- **Geofencing** — admin CRUD + haversine evaluation.
- **Selfie attendance (Phase A)** — native camera capture, client compression, atomic upload, evidence modal; no face/liveness/AI (by design).
- **Admin Attendance Console** — paginated/filtered/sortable, CSV export (20k cap + metadata), per-row evidence modal, mobile stacked-card layout.

**Architecture:** events are the source of truth; the existing daily `Attendance` row is a derived **projection** (`projectDay`). Payroll/Leave/Reports read `Attendance` unchanged.

**Config-only (not ingesting yet):** biometric (ZKTeco/eSSL/Matrix/generic), QR, RFID/NFC, webcam, external API.

**Design doc:** `docs/ATTENDANCE_FRAMEWORK_ARCHITECTURE.md`.

---

## 5. Support Desk Completion Status (~88%)

- ✅ Queue/category management, ticket create/list/detail, status state machine, assignment + history, comments with visibility tiers (PUBLIC/INTERNAL/ADMIN_ONLY), internal notes.
- ✅ AI auto-routing/categorization (Groq default / OpenAI / Gemini) via BullMQ; manual reprocess with MANUAL-only cooldown.
- ✅ Admin console + employee experience; RBAC + serializer anti-leakage verified.
- ✅ **Activity timeline endpoint fixed this session** — `GET /api/support/tickets/:id/activity` now exists; agents see full timeline, employees see public-safe events only.
- Feature-flagged: `SUPPORT_DESK`, `SUPPORT_AI_CATEGORIZATION`.

**Design doc:** `docs/SUPPORT_DESK_ARCHITECTURE.md`.

---

## 6. Open Issues

1. **Public Cloudinary URLs** — payslips, ID documents, and selfie evidence are stored as public-but-unguessable `secure_url`s (no signed/authenticated delivery). **High** for financial/biometric data. (Batch 3)
2. **No session/token revocation** — logout is client-side only; a stolen JWT is valid until expiry. `refreshToken` columns exist but the rotation flow is unused. (Batch 3)
3. **No automated retention** for selfie evidence / documents.
4. **Feature flags have no admin toggle UI** — DB/env only; direct DB edits don't invalidate the Redis cache (must call `featureFlags.invalidate()` or clear `ff:*`).
5. **MFA status** not confirmed (no clear 2FA implementation found).
6. **Two unverified scoping spots** (low risk): `uploadPayslip`, `certificate` non-public reads, `engagement` giver scoping — flagged in the Phase B audit for a quick confirm.

---

## 7. Remaining Technical Debt

- **Thin automated test coverage relative to surface** — 13 server suites / 125 tests, **0 client tests**. Security regression guards are now in place, but business-logic coverage (esp. payroll-adjacent) is light.
- **Two coexisting backend styles** — clean `modules/*` (Attendance, Support) vs legacy flat `controllers/*`; the legacy side is where the serializer/scoping gaps lived.
- **Attendance projection runs inline** (not queued) — fine for manual/CSV/GPS volumes; needs a BullMQ recompute queue before biometric scale.
- **Existing web-portal check-in not yet refactored** to emit events (deliberately deferred; engine only manages rows it generated).
- **Reporting**: no scheduled reports; `getAttendanceReport` loads full users into memory for CSV (whitelisted columns, not a response leak, but inefficient).
- `server/resetPassword.ts` (hardcoded creds, gitignored) should be deleted; pre-existing `UploadService` unhandled-rejection on a bad image.

---

## 8. Payroll Readiness Summary

**Payroll has not been started.** Security prerequisites are now substantially met:
- ✅ Serializer credential/PII leaks closed + guarded (new payroll endpoints must use `safe-select` + whitelists).
- ✅ Tenant-isolation bypasses (import, offboarding) fixed; employee-roster integrity restored (import now scoped + permissioned).
- ✅ Audit trail on financial/HR mutations (leave, expense, asset, timesheet, payslip download, offboarding, shift, document).
- ⚠️ **Mandate for Payroll build:** whitelist serializers + audit logging from day one; salary/bank data must never enter a list/feed serializer.
- ⚠️ Fast-follow (not blocking): signed payslip delivery (#9), session invalidation (#9).

**What Payroll still needs (build scope):** complete earnings/deductions rule engine; statutory accuracy (PF/ESI/TDS/PT); payroll run lifecycle (draft → lock → publish → reversal/arrears); payslip distribution; statutory/register reports; robust LOP from attendance + leave.

**Readiness verdict:** security-cleared to begin Payroll; the two Batch 3 items should land as an immediate fast-follow, ideally before payslips are distributed externally.

---

## 9. Pending Batch 3 Items (scheduled fast-follow — do NOT block Payroll)

1. **Signed / private Cloudinary delivery** — upload new payslips/ID-docs/selfies as `authenticated`; serve via short-lived signed URLs (app-proxied or signed). _Effort: Large._ Migration caveat: existing public files stay public unless re-uploaded.
2. **Session invalidation** — Redis revocation marker + `iat` check in the auth middleware (fail-open if Redis down); real `POST /auth/logout` (+ logout-all); bump on password change/reset. _Effort: Medium._
3. (Optional) Retention purge job for selfies/documents; feature-flag admin toggle UI.

---

## 10. Current Branch / Commit References

- **Remote:** `v2` → `https://github.com/shekharzorin/CitrUX-HRMS-2.0.git` (never push to `origin`/Render).
- **Branch:** `main` · **HEAD:** `6d77b94` (pushed; `v2/main` up to date).

Recent security/attendance commits (newest first):
```
6d77b94  security(high): Support activity endpoint, upload hardening, orphan cleanup, audit (Phase B, Batch 2)
0cff84c  security(critical): fix tenant-isolation + permission bypasses (Phase B, Batch 1)
549a858  security(critical): serializer whitelist sweep + audit logging on approvals (Phase A)
4f7f537  feat(attendance): align Attendance Console to spec (9 items)
adb7a4b  fix(attendance): stop GET /api/attendance/all leaking full User
ed1a2f7  feat(attendance): admin all-employees Attendance Console
f38c5c6  feat(attendance): Selfie Attendance (Phase A)
1fcf21b  feat(attendance): Mobile GPS check-in + geofencing
```
Additive Prisma changes applied via `db push` (no migrations); SQL artifacts in `server/prisma/sql/0001–0007`.

**Uncommitted (intentional):** `server/scripts/seed-support-demo.cjs` (dev seed), `server/email_debug.log` (runtime log).

---

## 11. Tests Passing Summary

- **Server:** `npm test` (Jest, no DB / mock + source-scan) — **13 suites, 125 tests, all passing.**
- **TypeScript:** `tsc --noEmit` clean (server) and `tsc -b` clean (client).
- New this session: `safe-select`, `serializer-guard`, `audit-coverage`, `tenant-isolation`, `permission-guard`, `support-visibility`.
- **Client:** no automated tests (gap — see Technical Debt).

---

## 12. Recommended Next Step When Resuming Work

**Begin Payroll development** (the gating workstream), with two guardrails:
1. **Land Batch 3 first or in parallel** (signed payslip delivery + session invalidation) before any external payslip distribution.
2. **From day one in Payroll:** use `userSafeSelect`/whitelist serializers (never expose salary/bank in lists), wrap every financial mutation in `AuditService.log`, and add Jest coverage for the calculation engine and statutory logic (the biggest test-coverage gap).

Suggested Payroll build order: earnings/deductions rule engine → statutory (PF/ESI/TDS/PT) with verification → run lifecycle (draft/lock/publish/reversal) → payslip generation + signed distribution → statutory/register reports → attendance/leave LOP integration.

> **Local dev reminder:** no Docker/WSL. Portable Redis at `D:\hrms-arc\.redis\redis-server.exe` (start hidden); server `cd server && npm run dev` (:5000); client (:5173). DB = Supabase (remote). On Windows, stop the dev server before `prisma generate` (DLL lock). When toggling feature flags directly in the DB, clear `ff:*` in Redis.
