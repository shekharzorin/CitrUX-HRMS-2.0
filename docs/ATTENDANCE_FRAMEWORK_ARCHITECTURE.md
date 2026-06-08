# Citrux HRMS — Attendance Management Framework (Architecture)

Status: **Design.** No code yet. Defines an extensible, multi-tenant attendance
framework where companies configure one or more attendance *sources* without
changing core HRMS code.

Lives **inside** `CitrUX-HRMS-2.0` as a modular domain — not a separate repo.
Database: **PostgreSQL + Prisma only**. No MongoDB.

> **Central design decision:** attendance **events are the source of truth**; the
> daily `Attendance` record is a **derived projection** of those events. This single
> choice is what decouples calculation from source type, lets multiple sources run
> at once, makes ingestion idempotent/replayable, and leaves Payroll/Leave/Reports
> (which already read `Attendance`) untouched.

> **Admin owns all settings.** Every configuration surface in this framework —
> sources, per-method enablement, geofences, policies, source priority, sync,
> identity mapping, quarantine — is **admin-controlled** and gated behind admin
> permissions. Employees only check in/out and view their own history. There are no
> employee-editable configuration knobs.

---

## 0. Reuse map (what we build ON, not rebuild)

| Concern | Existing asset reused |
|---|---|
| Daily record | **`Attendance`** model (`@@unique([userId,date])`, checkIn/checkOut/hours/status/isLate/breaks) — becomes the projection / "AttendanceRecord" |
| Calc config | **`AttendancePolicy`** (rich: grace, half-day, OT, auto-clock-out, geofence radius), `Shift`, `ShiftPolicyOverride`, `UserPolicyOverride`, `Break` |
| Effective policy | `attendance-policy.service.ts` → `getEffectivePolicy(userId)`, `resolveAttendanceStatus`, `resolveShiftEnd` |
| Auth / JWT | `authenticateToken`, JWT `{ userId, role, companyId, accessRoleId }` |
| RBAC | `requirePermission`/`requireAnyPermission`, `PermissionService` catalog, `RoleService` (dual-read + cache). Existing perms `MANAGE_ATTENDANCE`, `APPROVE_ATTENDANCE` |
| Tenancy | `companyId` scoping everywhere; cross-tenant access → 404 |
| Async jobs | BullMQ infra (`queues/index.ts` connection, dedicated worker connection via `connection.duplicate()`) |
| Auto-clock-out | existing `attendanceWorker` → reframed as a system **event emitter** |
| Feature flags | `FeatureFlagService` (per-company SystemSetting → global → env), `requireFeature` mount guard |
| Regularization | `AttendanceRequest` model (adjustment + manager comment) |
| Audit | `AuditLog` (`action, entityType, entityId, performedBy`) and/or `AuditService` |
| Notifications | `Notification`, `notifyUser`/`notifyRole`, `SocketService` |
| Validation | `validate` middleware + Zod |
| UI shell | `Layout` (sidebar/topbar/theme), `AuthContext.hasPermission`, design-system |

**The current system conflates source and record** — `checkIn`/`checkOut` mutate the
`Attendance` row directly. This framework inserts an **event layer underneath** and
turns the existing direct write into "just another source" (a `WEB_PORTAL`/`MOBILE`
source emitting events).

---

## 1. Risk & constraint analysis (decided up front)

### 1.1 Architectural risks
| Risk | Mitigation |
|---|---|
| Source/record conflation (N writers racing one daily row) | Events are truth; `Attendance` is a projection. Sources only emit events. |
| Non-idempotent ingestion (webhook retries, device replays, CSV re-uploads, offline resync) | Every event has `dedupKey` (`companyId+sourceId+externalId\|hash`) with a unique constraint; ingestion = upsert-by-dedupKey. |
| Calculation coupled to source | Engine consumes a **normalized event shape only**; `verificationMethod`/`confidenceScore` are data, never control flow. |
| Config-as-credentials leakage | Encrypt secret config fields at rest; serializer whitelist so secrets never leave the API. |
| Clock skew & timezone | Store `timestamp` UTC + capture `deviceTime`/`tzOffset`; **business date computed in tenant/employee timezone**, not server UTC. |
| Mutating immutable history | Events append-only; corrections are new events (`MANUAL_OVERRIDE`/`VOID`, `supersedesId`). |
| Late / out-of-order events after payroll | Record lifecycle `OPEN→FINALIZED→LOCKED`; late events on a `LOCKED` record raise an `AttendanceRequest` adjustment instead of silently changing finalized data. |

### 1.2 Scalability concerns
- **Event volume / `rawPayload` bloat** → keep `AttendanceEvent` lean; offload raw vendor payloads to `AttendanceEventRaw` with retention TTL; month-partition events past a threshold.
- **Hot daily-row contention** → recompute is **queued + debounced per `(employeeId, businessDate)`** (BullMQ jobId dedupe), never inline.
- **Noisy neighbor** → separate queues by workload class (realtime / bulk / recompute / sync) with per-tenant concurrency caps.
- **Webhook spikes** → endpoint does validate → enqueue → `202`, never compute synchronously.
- **Sync fan-out** → one scheduler enqueues per-source pulls with jitter; workers scale horizontally on shared Redis.

### 1.3 Vendor integration challenges
- **On-prem devices are unreachable from a cloud HRMS (hardest problem).** ZKTeco/eSSL/Matrix sit behind LAN/NAT. Two patterns:
  1. **Push protocol** — devices supporting ADMS/`iclock` push to a cloud URL we expose.
  2. **On-prem Connector Agent** — a small installable on the customer LAN that talks the vendor SDK/TCP locally and forwards normalized events over outbound HTTPS with a scoped per-source token. **Recommended default for biometric.**
- **Protocol heterogeneity** → every quirk isolated inside a vendor **adapter** behind a stable interface.
- **Identity mapping** → devices use their own enrollment IDs; `AttendanceIdentity` maps `(sourceId, externalUserId) → employeeId`; unmapped punches **quarantine**, never drop.
- **Trust/spoofing** (fake GPS, reused selfies, forged webhooks) → signed webhooks (HMAC+timestamp), plausibility checks, `confidenceScore`; **flag, don't block** ingestion.
- **Vendor SLA variance** → treat every source as unreliable; heartbeat/health, backfill on reconnect, surfaced sync status.

### 1.4 Multi-tenant considerations
- Strict `companyId` scoping on every model/query; webhook tenant resolved from per-source token, never client body.
- Per-tenant method enablement via `FeatureFlagService` (`feature:ATTENDANCE_<METHOD>:<companyId>`).
- Per-tenant secret encryption keyed per company.
- Tenant-scoped rate limits/quotas on webhooks & imports.
- Reuse existing RBAC; **all settings are admin-only** (see §3.4).
- Timezone is a tenant/employee attribute, not a server constant.

---

## 2. Overall architecture

```
        INGESTION LAYER                    PROCESSING LAYER              CONSUMPTION LAYER
┌──────────────────────────────┐   ┌───────────────────────────┐   ┌────────────────────────┐
│ Source Adapters (plugins)     │   │ AttendanceEvent (truth)    │   │ Attendance (projection)│
│  biometric ZKTeco/eSSL/Matrix │──▶│ append-only, idempotent,   │──▶│  = AttendanceRecord    │
│  mobile GPS/selfie, QR,       │   │ normalized, per-tenant     │   │  workHours/OT/status   │
│  RFID/NFC, webcam, manual,    │   └───────────┬───────────────┘   └─────────┬──────────────┘
│  CSV, external API            │               │ enqueue recompute            │ reads (unchanged)
└───────────────┬──────────────┘               ▼                              ▼
        normalize│             ┌────────────────────────────┐        Payroll / Leave / Reports
                 ▼             │ Calculation Engine          │
        Ingestion Gateway ────▶│ deterministic, policy-driven │
   (webhook|sync|import|direct)│ source-agnostic (PURE)      │
                               └────────────────────────────┘
```

Principles: event sourcing for punches; materialized projection for the day; adapters
are dumb + uniform (only output = normalized events); existing direct check-in becomes
a source; everything async + idempotent beyond validate-and-enqueue.

---

## 3. Module boundaries

```
server/src/modules/attendance-framework/
  sources/      # AttendanceSource CRUD, config validation, secret encryption   (ADMIN)
  ingestion/    # gateway: webhook | import | direct check-in → normalize → enqueue
  events/       # AttendanceEvent write/read, dedup, quarantine, identity mapping
  engine/       # calculation engine (policy-driven projection) — PURE, no source I/O
  adapters/     # vendor plugins implementing AttendanceSourceAdapter
    biometric/{zkteco,essl,matrix,generic}/  mobile/ qr/ rfid/ webcam/ manual/ csv/ external-api/
  registry/     # plugin registration + capability discovery
  sync/         # scheduled sync orchestration, AttendanceSyncRun, health         (ADMIN)
  geofence/     # geofence rules + evaluation                                     (ADMIN)
  admin/        # admin serializers/controllers for all config                    (ADMIN)
  shared/       # façade over RBAC, feature-flags, audit, tenancy, notifications
server/src/queues/attendanceQueues.ts   # ingest:realtime | ingest:bulk | recompute | sync
connector-agent/   # SEPARATE deployable — on-prem agent for LAN biometric devices
```

**Dependency rule (one-way):** `adapters → ingestion → events → engine → projection`.
The **engine depends on nothing in `adapters`** — that is what keeps calculation
source-independent.

### 3.4 RBAC — admin owns all settings
Add to the `PermissionService` catalog, granted to **ADMIN** (and SUPER_ADMIN):
- `MANAGE_ATTENDANCE_SOURCES` — create/edit/delete sources, secrets, priority, enable/disable methods.
- `MANAGE_ATTENDANCE_GEOFENCE` — geofence rules.
- `VIEW_ATTENDANCE_SYNC` — sync runs, logs, quarantine, health.
- (Reuse) `MANAGE_ATTENDANCE` — policy + manual entry/override; `APPROVE_ATTENDANCE` — adjustments.

Policy choice: **bundle all config under ADMIN** (HR may keep `MANAGE_ATTENDANCE`/
`APPROVE_ATTENDANCE` for day-to-day, but source/geofence/sync configuration is
ADMIN-only). Managers get manual entry for their reports only. Employees get **no**
configuration permissions. Backfill new perms into existing `AccessRole`s (same
pattern as the RBAC/Support-Desk rollouts).

---

## 4. Prisma schema recommendations

Reuse `Attendance`/`AttendancePolicy`/`Shift`/overrides. Add the event/source layer
additively via **`db push`** (no `prisma migrate`, per repo convention) + an additive
SQL artifact in `prisma/sql/00xx`.

**New `AttendanceSource`** (per-tenant method config)
`id, companyId, name, type(enum), configuration(Json — secrets encrypted), isActive,
priority(Int — conflict tiebreak), ingestionMode(enum WEBHOOK|PULL_SYNC|IMPORT|DIRECT),
webhookSecret?, lastSyncAt?, healthStatus, createdAt, updatedAt`
— `@@index([companyId, isActive])`.
`type` enum: `BIOMETRIC_ZKTECO | BIOMETRIC_ESSL | BIOMETRIC_MATRIX | BIOMETRIC_GENERIC |
MOBILE_GPS | QR | RFID_NFC | WEBCAM | MANUAL | CSV_IMPORT | EXTERNAL_API | WEB_PORTAL`.

**New `AttendanceEvent`** (append-only truth)
`id, companyId, employeeId?(nullable→quarantine), sourceId, eventType(enum
CHECK_IN|CHECK_OUT|PUNCH|BREAK_START|BREAK_END|MANUAL_OVERRIDE|VOID), timestamp(UTC),
deviceTime?, tzOffset?, businessDate(tenant tz), confidenceScore?, verificationMethod,
locationData(Json: lat/lng/accuracy/geofenceId), deviceInfo(Json), dedupKey,
externalId?, supersedesId?, status(enum ACCEPTED|QUARANTINED|VOIDED), ingestedAt,
ingestedVia`
— `@@unique([companyId, dedupKey])`, `@@index([companyId, employeeId, businessDate])`,
`@@index([sourceId, ingestedAt])`.

**New `AttendanceEventRaw`** — `eventId @unique, rawPayload(Json), expiresAt` (offload heavy payloads).

**Extend `Attendance`** (the projection) — add: `companyId`, `firstCheckIn`/`lastCheckOut`
(alias existing checkIn/out), `overtimeHours(Float)`, `primarySourceId?`,
`generatedFromEventCount/Ids`, `recomputeVersion(Int)`, `lifecycle(enum
OPEN|FINALIZED|LOCKED)`, `lastRecomputedAt`. Keep `@@unique([userId,date])`. **Existing
readers (payroll/leave/reports) keep working.**

**Supporting:** `AttendanceIdentity(companyId, sourceId, externalUserId, employeeId
@@unique([sourceId, externalUserId]))`; `AttendanceSyncRun(sourceId, startedAt,
finishedAt, status, eventsPulled/Accepted/Quarantined, error?)`; `Geofence(companyId,
name, centerLat, centerLng, radiusMeters, branchId?, isActive)`.

**Future (schema-only, no logic):** `AttendanceDevice` (health/heartbeat),
`AttendanceAnomaly` (fraud/anomaly flags), `OfflineSyncBatch` (mobile offline). Define
columns now, build later (same "design-ahead" approach used for `TicketRelationship`).

Audit reuses `AuditLog` (`entityType='ATTENDANCE_SOURCE'|'ATTENDANCE_EVENT'|...`).

---

## 5. Source plugin architecture

Registry + a single interface every method implements:

```
interface AttendanceSourceAdapter {
  type: AttendanceSourceType;
  capabilities: { ingestion: ('WEBHOOK'|'PULL'|'IMPORT'|'DIRECT')[];
                  needsConnectorAgent: boolean; supportsRealtime: boolean };
  validateConfig(config): Result;                         // admin save-time
  normalize(rawInput, ctx): NormalizedAttendanceEvent[];  // THE decoupling firewall
  pull?(source, since): Promise<RawBatch>;                // PULL_SYNC sources
  verifyWebhook?(req): boolean;                           // HMAC/signature
  healthCheck?(source): Promise<HealthStatus>;
}
```

- **Registration at boot:** `AttendanceRegistry.register(adapter)`. New vendor = one
  adapter file + register → **zero core changes** ("no core HRMS edits" requirement met).
- **Capability-driven admin UX:** the registry tells the admin form which config fields,
  ingestion modes, and whether a Connector Agent is required — the form is generated.
- **`NormalizedAttendanceEvent` is the firewall:** adapters may be messy inside;
  downstream only ever sees the normalized shape → engine stays source-agnostic.

---

## 6. Vendor adapter strategy
- **Biometric (ZKTeco/eSSL/Matrix):** prefer **push** (ADMS/`iclock` → cloud webhook);
  fall back to the **on-prem Connector Agent** (SDK/TCP locally → outbound HTTPS, scoped
  token). Agent is "dumb pipe + normalize"; all policy/calc stay in cloud.
- **Generic API biometric / third-party systems:** `EXTERNAL_API` adapter with
  configurable field mapping; webhook or pull.
- **Mobile / QR / RFID / webcam:** `DIRECT` adapters — app/desktop posts a structured
  check-in; adapter validates (geofence eval, QR token, RFID UID lookup, selfie URL) and
  normalizes.
- **CSV import:** `IMPORT` adapter with column-mapping + dry-run validation; each row →
  one event with a deterministic `dedupKey` (re-imports safe).
- **Manual entry:** `MANUAL` adapter — `MANAGE_ATTENDANCE` action emits `MANUAL_OVERRIDE`
  events, fully audited.
- Adapters independently versioned; per-adapter contract tests assert `normalize()`
  output conforms to the normalized schema.

---

## 7. API contracts (shapes, not code)

**Ingestion**
- `POST /api/attendance/webhook/:sourceToken` → validate signature → enqueue → **202** (tenant+source from token).
- `POST /api/attendance/check-in` / `/check-out` (employee, DIRECT): `{ method, location?, selfieUrl?, qrToken?, rfidUid?, deviceInfo? }` → event → `202`.
- `POST /api/attendance/import` (ADMIN, multipart CSV + sourceId): `{ dryRun }` → validation report or accepted batch.
- `POST /api/attendance/sync/:sourceId/run` (ADMIN): trigger pull now.

**Admin / config (all ADMIN-gated)**
- `GET/POST/PUT/DELETE /api/attendance/sources` (`MANAGE_ATTENDANCE_SOURCES`) — secrets write-only, never returned.
- `GET /api/attendance/sources/:id/sync-runs` (`VIEW_ATTENDANCE_SYNC`).
- `GET/POST /api/attendance/geofences` (`MANAGE_ATTENDANCE_GEOFENCE`).
- `GET/PUT /api/attendance/policy` (`MANAGE_ATTENDANCE`) — reuses existing policy.
- `GET /api/attendance/registry/capabilities` — drives the dynamic config UI.
- `GET /api/attendance/quarantine` + `POST /api/attendance/quarantine/:id/map` — map unmapped device IDs.

**Employee / records**
- `GET /api/attendance/me?from&to` — history incl. `sourceType`/`verificationMethod`.
- `GET /api/attendance/me/:date` — day detail + contributing events.
- `POST /api/attendance/adjustments` — regularization (reuses `AttendanceRequest`).

Conventions: `authenticateToken` + `requirePermission`; `companyId`-scoped; `202` for
async ingestion; idempotent on `dedupKey`; role-aware serializers (employees never see
raw payloads, other employees, or source secrets).

---

## 8. Background job strategy (BullMQ)

| Queue | Producer | Job | Idempotency |
|---|---|---|---|
| `attendance:ingest:realtime` | webhooks, direct check-in | normalize+persist event | upsert on `dedupKey` |
| `attendance:ingest:bulk` | CSV, large API batches | chunked normalize+persist | per-row `dedupKey` |
| `attendance:recompute` | event persistence | recompute `(employeeId,businessDate)` | **jobId=`recompute-<emp>-<date>`** (debounce) |
| `attendance:sync` | scheduler | pull one PULL_SYNC source | `SyncRun` row + cursor |

- Workers use a **dedicated Redis connection** (`connection.duplicate()`).
- Scheduler enqueues per-source pulls with **jitter**; cursor on `AttendanceSource.lastSyncAt`.
- Recompute **debounced** — a 5k-event sync collapses to one recompute per affected `(employee, day)`.
- Retries + backoff + dead-letter; failures surface in `AttendanceSyncRun`. **Never swallow enqueue errors** (BullMQ lesson).
- Auto-clock-out worker stays, reframed to **emit a synthetic `CHECK_OUT` event** so system actions flow the same pipeline.

---

## 9. Calculation engine design

A **pure deterministic function**: `project(events[], policy, shift, tz) → AttendanceRecord`.
No source branching, no I/O.

- **Input:** all `ACCEPTED` events for `(employee, businessDate)` + effective policy
  (`getEffectivePolicy`: Policy → ShiftPolicyOverride → UserPolicyOverride) + shift + tz.
- **Steps:** order by timestamp → pair check-in/out into sessions (honor
  `allowMultipleSessions`) → subtract breaks → compute `workHours`, `overtimeHours`
  (beyond `fullDayHours`/`maxWorkHoursPerDay`), `isLate` (shift start + grace),
  `attendanceStatus` (PRESENT/HALF_DAY/ABSENT/LATE via `halfDayThresholdHours`,
  `markLateAfterMinutes`, `absentIfNoPunchInAfterHours`) → derive
  `firstCheckIn`/`lastCheckOut` → write projection, bump `recomputeVersion`.
- **Determinism = re-runnable**: recompute from scratch anytime; late/corrected events
  just re-trigger projection. No incremental drift.
- **Source priority resolves conflicts only** (two sources, same 9:00 punch) — a tiebreak
  input to ordering/dedup, never a fork in the math.
- **Lifecycle guard:** `LOCKED` (payroll-finalized) records don't mutate on late events —
  they raise an `AttendanceRequest` adjustment for approval.
- **Confidence/verification recorded, not decisive** (until fraud-detection adds a
  *post*-projection annotator).

---

## 10. Admin UX (admin owns all settings)
- **Sources dashboard:** card/list per source — type icon, `isActive` toggle, health
  (green/amber/red), last sync, today's event count, priority. Add-source wizard with
  fields **driven by `registry/capabilities`** (new vendors need no UI work).
- **Per-method enable/disable** maps to feature flags + `isActive`; clearly flag methods
  needing the **Connector Agent** (download + token).
- **Geofence editor:** map picker (center + radius), attach to branch; list view.
- **Policy editor:** surface existing `AttendancePolicy` fields with shift/user override visibility.
- **Sync & logs:** `AttendanceSyncRun` history; **quarantine inbox** (unmapped device IDs
  → one-click map to employee); webhook delivery log.
- **Priority management:** drag-to-reorder; explain it only affects conflict tiebreaks.
- Reuse compact admin tables; **never render source secrets**.

## 11. Employee UX
- **One check-in/out surface** regardless of method; app offers only allowed method(s).
  Mobile: GPS + (when required) selfie; show geofence status before enabling the button.
- **History** shows the **source/verification used** per day (`primarySourceId` /
  `verificationMethod`).
- **Day detail** lists contributing punches (transparency → fewer disputes).
- **Regularization** for missed punches (reuses `AttendanceRequest`).
- **Offline-friendly mobile (future):** local queue + `dedupKey` → no double-count.
- Accessibility: method/geofence state via text + icon, not color alone.

---

## 12. Rollout strategy (MVP → Advanced)

- **Phase 0 — Foundation (no behavior change).** Add source/event/raw + extend
  `Attendance` (additive `db push`); stand up registry, recompute queue, engine.
  **Refactor existing check-in/out to emit events** through the pipeline, projecting to
  the same `Attendance` rows. Gate behind `feature:ATTENDANCE_FRAMEWORK:<companyId>`,
  default off; **run projection in shadow and diff against current numbers** before cutover.
- **Phase 1 — MVP methods.** Manual, CSV import, Mobile GPS + geofencing, QR (all
  `DIRECT`/`IMPORT`, no on-prem dependency). Admin sources dashboard + sync/quarantine.
- **Phase 2 — Biometric.** Generic API + **Connector Agent**, then ZKTeco → eSSL →
  Matrix (push where supported). Webhook signing, identity mapping/quarantine, sync health.
- **Phase 3 — Verification & trust.** Selfie, RFID/NFC, webcam desktop; `confidenceScore` surfaced.
- **Phase 4 — Advanced (architecture already supports).** Face recognition
  (post-projection verifier), fraud/buddy-punch detection (anomaly annotator over events),
  AI anomaly detection, offline mobile sync, device health — all **additive consumers/
  annotators of the event stream**, no core rewrite.

---

## 13. Open decisions (need product/owner call before build)
1. **Connector Agent scope** — are target biometric customers mostly cloud-push-capable,
   or is the on-prem agent required in Phase 2? (Biggest build item.)
2. **Migration tolerance** — shadow-run events→projection in parallel for a window, or a
   harder per-tenant cutover?
3. **HR vs ADMIN split** — confirmed direction: **all source/geofence/sync config is
   ADMIN-only**; HR retains day-to-day `MANAGE_ATTENDANCE`/`APPROVE_ATTENDANCE`.
