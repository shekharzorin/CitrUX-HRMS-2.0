# Roles, Permissions & Privileged-Account Settings

Reference for the HRMS authorization model and the recommended configuration for
ADMIN and SUPER_ADMIN. Reflects the changes made on 2026-05-29.

## Roles

| Role | Scope | Intent |
|------|-------|--------|
| SUPER_ADMIN | Platform (all tenants) | Platform operator. God-mode across companies. Should NOT double as a company user. |
| ADMIN | Single company | Company owner/admin. Full control of their tenant incl. company config + payroll. |
| HR | Single company | People ops: users, leave, documents, attendance, appraisals. No company config or payroll by default. |
| MANAGER | Team | Approves leave/attendance, assigns tasks, views reports for their team. |
| EMPLOYEE | Self | No elevated permissions. |

## Permission matrix (current, post-change)

Defined in `server/src/services/permission.service.ts`.

| Permission | SUPER_ADMIN | ADMIN | HR | MANAGER |
|---|:--:|:--:|:--:|:--:|
| MANAGE_GLOBAL_SETTINGS | ✅ | — | — | — |
| MANAGE_COMPANY_SETTINGS | ✅ | ✅ | — | — |
| MANAGE_USERS | ✅ | ✅ | ✅ | — |
| MANAGE_PAYROLL | ✅ | ✅ | — | — |
| VIEW_ALL_LEAVES | ✅ | ✅ | ✅ | — |
| APPROVE_LEAVES | ✅ | ✅ | ✅ | ✅ |
| MANAGE_DOCUMENTS | ✅ | ✅ | ✅ | — |
| MANAGE_ATTENDANCE | ✅ | ✅ | ✅ | — |
| APPROVE_ATTENDANCE | ✅ | ✅ | ✅ | ✅ |
| ASSIGN_TASKS | ✅ | ✅ | ✅ | ✅ |
| VIEW_REPORTS | ✅ | ✅ | ✅ | ✅ |
| SUBMIT_APPRAISAL | ✅ | ✅ | ✅ | ✅ |
| VIEW_ALL_APPRAISALS | ✅ | ✅ | ✅ | — |

### What changed (2026-05-29)
1. **Split `MANAGE_SETTINGS`** into `MANAGE_GLOBAL_SETTINGS` (platform-wide
   `systemSetting` keys) and `MANAGE_COMPANY_SETTINGS` (tenant config). Previously
   only SUPER_ADMIN had `MANAGE_SETTINGS`, which meant **company ADMINs could not
   create leave types, run year-end, or change company branding** — a bug for a
   multi-tenant SaaS. Routes updated: `settings.routes` (updateSettings),
   `leave.routes` (createLeaveType / deleteLeaveType / year-end) now require
   `MANAGE_COMPANY_SETTINGS`. `settings.controller` already isolates global keys
   to SUPER_ADMIN by role check, so company ADMINs only touch their own branding.
2. **Differentiated ADMIN vs HR** (they were byte-for-byte identical). ADMIN now
   has `MANAGE_COMPANY_SETTINGS` + `MANAGE_PAYROLL`; HR has neither.
   - ⚠️ If your org wants HR to run payroll, add `'MANAGE_PAYROLL'` back to the HR
     array in `permission.service.ts`. One line.
3. **Role-based JWT lifetime knob** in `auth.controller.ts`: env vars
   `JWT_EXPIRES_IN` and `JWT_EXPIRES_IN_SUPER_ADMIN`. Both default to `7d`
   (no behavior change until set).

## SUPER_ADMIN hardening — recommended (NOT yet implemented)

SUPER_ADMIN is the highest-risk principal: it bypasses `authorizeRole`
(`auth.middleware.ts`) and can act on any tenant. A single leaked token = full
cross-tenant compromise. Recommended, in priority order:

1. **MFA (TOTP) required for SUPER_ADMIN login.** Largest item; needs a secret
   store (User.mfaSecret), enrollment + verify endpoints, and a login step-up.
2. **Refresh-token rotation + short access tokens.** The `User.refreshToken` /
   `refreshTokenExpiry` columns already exist but aren't used. Wire a `/auth/refresh`
   endpoint with rotation, then set `JWT_EXPIRES_IN_SUPER_ADMIN=1h` (knob is ready).
   Don't shorten the token without refresh, or SUPER_ADMIN gets logged out hourly.
3. **Audit every cross-tenant action.** NOTE: `tenantScope` middleware
   (`tenant.middleware.ts`) is currently **dead code** — defined but wired into no
   route. The `?companyId=` impersonation path it implements doesn't actually run;
   controllers use the `getTenantScope` utility instead. To audit cross-tenant
   writes, first wire a tenant middleware globally, then log SUPER_ADMIN writes
   via the existing `AuditService`. Consider an explicit "impersonation mode"
   instead of a silent query param.
4. **Platform-only enforcement.** A SUPER_ADMIN should have `companyId = null` and
   never be a company login. Enforce at user-creation and warn at login if violated
   (avoid a hard block that could lock out existing accounts).
5. **Optional IP allowlist** for SUPER_ADMIN sessions via env.

## ADMIN — recommended settings (the "best settings" for a company admin)
- **Can**: company branding, leave types & policies (incl. `leaveAccrualMode`),
  shifts, holidays, departments/branches, users within their company, payroll,
  attendance policy, documents, appraisals.
- **Cannot**: global `systemSetting` keys, other tenants, platform plans.
- This is enforced by `MANAGE_COMPANY_SETTINGS` on company-config routes +
  the company-scoping helpers (`getTenantScope`, `assertSameCompany`).
