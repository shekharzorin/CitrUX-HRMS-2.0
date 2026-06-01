# Design: Per-Tenant Dynamic Roles & Permissions (Option B)

Status: **Design — not yet implemented.** Author target: a focused implementation
session after sign-off. Date: 2026-05-29.

## 1. Goal

Let each onboarded company (tenant) define **its own roles** and decide **what
each role can do**, instead of every tenant sharing the five hardcoded roles
(`SUPER_ADMIN | ADMIN | HR | MANAGER | EMPLOYEE`) with one global permission map.

Concretely a tenant should be able to: rename/define roles ("Team Lead",
"Recruiter", "Finance"), grant/revoke individual permissions per role, and assign
users to those roles — all scoped to their company, with sensible defaults seeded
at onboarding.

## 2. Current state (what we're changing)

- **Roles are a Prisma enum** on `User.role` (`Role`), shared by all tenants.
- **Permissions are a hardcoded global map** in `services/permission.service.ts`
  (`rolePermissions: Record<Role, Permission[]>`). Not per-tenant.
- **Two enforcement styles are mixed across routes:**
  - `requirePermission('X')` — permission-based (≈ a dozen routes). Good.
  - `authorizeRole(['ADMIN','HR', ...])` — hardcoded role-NAME checks (~17 route
    files: asset, attendance-policy, certificate, document, expense, health,
    holiday, jobrole, offboarding, onboarding, organization, payslip, performance,
    recruitment, reports, shift, timesheet). These **will not honor tenant role
    config** unless migrated to permissions.
- **Latent bug proving the brittleness:** `asset.routes` uses
  `authorizeRole(['ADMIN','IT'])` but `IT` is not in the Role enum — it can never
  match, so only ADMIN works. Hardcoded role names rot silently.
- **~30 inline role checks in controllers**, two kinds:
  - Platform checks: `req.user.role === 'SUPER_ADMIN'` (keep — see §8).
  - Business checks: `role: { in: ['HR','ADMIN'] }` (e.g. who to notify in
    `leave.controller`, `notification.controller`) — should become permission- or
    capability-based queries.
- JWT payload today: `{ userId, role, companyId }` (`auth.middleware.ts`).

## 3. Target model

- A **Permission** is a fixed, code-defined capability (a catalog — see §5).
  Permissions are NOT tenant-editable; they're the vocabulary the app checks.
- A **Role** is a **per-tenant** named bundle of permissions (DB row, scoped by
  `companyId`).
- A **User** belongs to exactly one Role (could be extended to many later).
- **SUPER_ADMIN stays special and platform-level** — it is NOT a tenant role
  (see §8).

## 4. Schema changes (Prisma)

```prisma
model Role {
  id          String           @id @default(uuid())
  name        String                                  // "Admin", "HR", "Team Lead"
  description String?
  companyId   String                                  // tenant-scoped
  isSystem    Boolean          @default(false)         // seeded defaults; cannot be deleted
  isOwner     Boolean          @default(false)         // the protected "owner/admin" role (always all perms)
  permissions RolePermission[]
  users       User[]
  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, name])
}

model RolePermission {
  id         String @id @default(uuid())
  roleId     String
  permission String                                    // matches the code catalog (see §5)
  role       Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, permission])
}

model User {
  // ... existing fields ...
  role     Role?   @relation(fields: [roleId], references: [id])   // NEW
  roleId   String?                                                  // NEW
  // KEEP the existing `role` enum during transition, renamed to `legacyRole`,
  // then drop it once migration + backfill is verified (see §9).
}
```

Notes:
- `permission` is stored as a plain string matching the code catalog rather than a
  DB `Permission` table, so adding a new capability is a code change (catalog) +
  optional default-grant — no data migration needed to introduce a permission.
- `isSystem` / `isOwner` protect the seeded admin role from being stripped of
  permissions or deleted (anti-lockout — see §13).

## 5. Permission catalog (code-defined)

Expand today's 13 permissions into a complete catalog derived from the routes.
Proposed additions (so the `authorizeRole` routes can move to permissions):

| Permission | Replaces today's check on |
|---|---|
| MANAGE_GLOBAL_SETTINGS | (platform, SUPER_ADMIN) |
| MANAGE_COMPANY_SETTINGS | settings, leave types, year-end |
| MANAGE_USERS | user CRUD |
| MANAGE_PAYROLL | payroll, payslip upload, encashment status |
| VIEW_ALL_LEAVES / APPROVE_LEAVES | leave |
| MANAGE_DOCUMENTS / VIEW_USER_DOCUMENTS | document routes |
| MANAGE_ATTENDANCE / APPROVE_ATTENDANCE | attendance, attendance-policy |
| ASSIGN_TASKS | tasks |
| VIEW_REPORTS | reports |
| SUBMIT_APPRAISAL / VIEW_ALL_APPRAISALS | performance |
| **MANAGE_ASSETS** | asset routes (fixes the dead `IT` check) |
| **APPROVE_EXPENSES / MANAGE_EXPENSE_CONFIG** | expense routes |
| **MANAGE_HOLIDAYS** | holiday routes |
| **MANAGE_JOB_ROLES** | jobrole routes |
| **MANAGE_ONBOARDING / MANAGE_OFFBOARDING** | on/offboarding routes |
| **MANAGE_ORG_STRUCTURE** | organization (branches/departments) |
| **MANAGE_SHIFTS** | shift routes |
| **APPROVE_TIMESHEETS** | timesheet pending/approve |
| **ISSUE_CERTIFICATES** | certificate issue |
| **MANAGE_RECRUITMENT** | recruitment |
| **VIEW_SYSTEM_HEALTH** | health routes |

Keep the catalog as a `const PERMISSIONS = [...] as const` so it's typed and a
`GET /api/permissions` endpoint can expose it to the role-management UI.

## 6. Default role templates + tenant onboarding

On company creation (`company.routes` POST `/`), seed a default set of roles +
permission grants in the same transaction that creates the company + first admin:
- **Owner/Admin** (`isOwner=true`, `isSystem=true`): all tenant permissions.
- **HR**, **Manager**, **Employee** (`isSystem=true`): seeded from the current
  matrix in `permission.service.ts` (so behavior is unchanged out of the box).
The first admin user is assigned the Owner role. Tenants can then clone/edit
non-system roles and create new ones.

## 7. Auth flow, JWT & permission resolution

- **Keep the JWT small**: put `roleId` (not the permission list) in the token, or
  keep `role` name for display and resolve permissions server-side per request.
  Embedding permissions in the JWT makes revocation lag until token expiry — avoid.
- **Resolution + caching**: `PermissionService.getPermissions(roleId)` loads
  `RolePermission` rows, cached in Redis via the `CacheService` we fixed
  (key `tenant:{companyId}:resource:rolePerms:{roleId}`), invalidated whenever a
  role's permissions change. O(1) per request after warm cache.
- `requirePermission(permission)` becomes: resolve current user's role
  permissions (cached) → check membership. Signature unchanged for routes.

## 8. SUPER_ADMIN handling

SUPER_ADMIN is the **platform operator**, not a tenant role. Keep it out of the
per-tenant Role table:
- Keep a boolean/flag or a reserved `legacyRole = SUPER_ADMIN` / dedicated column
  on User for platform staff (companyId = null).
- `authenticateToken` + a `isPlatformAdmin` check bypass tenant permission
  resolution (mirrors today's `authorizeRole` SUPER_ADMIN bypass).
- The inline `role === 'SUPER_ADMIN'` controller checks (company.controller,
  shift.controller, assertSameCompany, etc.) map to `isPlatformAdmin(req.user)`.

## 9. Migration plan (enum → relational), zero-downtime

1. **Add** `Role` + `RolePermission` tables and `User.roleId` (nullable). Rename
   existing `User.role` enum to `legacyRole` (keep it). Additive — safe `db push`.
2. **Backfill**: for each company, create the 4 system roles from the current
   matrix; set each user's `roleId` from their `legacyRole`. Platform SUPER_ADMINs
   flagged separately (companyId null).
3. **Dual-read shim**: `PermissionService.hasPermission` prefers `roleId` config,
   falls back to `legacyRole` + static map if `roleId` is null. Lets us deploy
   without a flag-day.
4. **Migrate routes**: replace every `authorizeRole([...])` with the matching
   `requirePermission(...)` from §5. Migrate inline business role checks.
5. **Verify** (tests + live), then **drop** `legacyRole` and the static map.

## 10. Route gating migration map

Each `authorizeRole` group maps to a permission from §5 — e.g.
`authorizeRole(['ADMIN','HR','MANAGER'])` on expense approvals → `APPROVE_EXPENSES`;
`authorizeRole(['ADMIN','IT'])` on assets → `MANAGE_ASSETS` (and the dead `IT`
disappears). Full table to be produced during implementation from the §2 route list.

## 11. New API surface

- `GET /api/permissions` — the catalog (for the UI).
- `GET /api/roles` — tenant's roles + their permissions.
- `POST /api/roles`, `PUT /api/roles/:id`, `DELETE /api/roles/:id` — manage roles
  (gated by a new `MANAGE_ROLES` permission; system/owner roles protected).
- `PUT /api/users/:id/role` — assign a role to a user (gated by `MANAGE_USERS`).
All tenant-scoped via `getTenantScope` / `assertSameCompany`.

## 12. UI

A "Roles & Permissions" admin screen: list roles, a permission checkbox matrix
(grouped by domain), create/clone/edit/delete, and a user→role assignment control.

## 13. Security considerations

- **Anti-lockout**: the `isOwner` role always has all permissions and cannot be
  deleted or stripped; block removing the last user holding it.
- **Privilege-escalation guard**: a user managing roles must not grant a
  permission they don't themselves hold; only `MANAGE_ROLES` holders can edit roles.
- **Protect platform admin**: never expose SUPER_ADMIN / platform flag through
  tenant role management. Rework `user.controller`'s role-hierarchy checks
  (lines ~371, ~495 protect ADMIN/HR/SUPER_ADMIN) onto the new model.
- **Cache invalidation** on every role/permission edit to prevent stale grants.

## 14. Effort & phasing

- **P1** Schema + catalog + seeding + dual-read shim (no behavior change). 
- **P2** Migrate `authorizeRole` routes + inline checks to permissions.
- **P3** Role-management API + UI.
- **P4** Backfill, verify, drop `legacyRole` + static map.
Each phase ships independently behind the dual-read shim.

## 15. Open questions for sign-off
1. One role per user, or multiple roles (additive permissions)? (One is simpler;
   multiple is more flexible.)
2. Should SUPER_ADMIN remain a hard-coded platform flag, or also become a
   platform-level dynamic role set?
3. Do any tenants need **resource-scoped** permissions (e.g. "approve leave only
   for my department") or is company-wide capability enough for v1?
4. Keep `JobRole` (designation) clearly separate from auth `Role` — confirm naming
   to avoid confusion (`Role` vs `JobRole`).
