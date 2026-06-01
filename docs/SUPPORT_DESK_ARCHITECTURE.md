# Citrux Support Desk — Technical Architecture (Phase 1)

Status: **Design.** Phase 1 only — ticket creation, assignment, comments, attachments,
status flow, notifications, AI auto-categorization. **Not** in scope: analytics,
knowledge base, SLA automation, advanced AI (schema leaves forward hooks but no logic).

Lives **inside** `CitrUX-HRMS-2.0` as a modular domain — not a separate repo.
Database: **PostgreSQL + Prisma only** (the HRMS datastore). No MongoDB.

## 0. Reuse map (what we build ON, not rebuild)

| Concern | Existing asset reused |
|---|---|
| Auth / JWT | `authenticateToken`, JWT `{ userId, role, companyId, accessRoleId }` |
| RBAC | `requirePermission` / `requireAnyPermission`, `PermissionService` catalog, `RoleService` (dual-read + cache) |
| Tenancy | `getTenantScope`, `assertSameCompany` (companyId scoping) |
| Entities | `User`, `Profile`, `Company`, `Department`, `Branch`, `AccessRole` (Prisma relations) |
| AI providers | provider-calling logic in `ai.controller.ts` (Gemini/OpenAI/Groq) + `ai_provider` system setting → extracted into `ai-engine` |
| Async jobs | BullMQ infra (`queues/index.ts` connection, worker pattern) → new `supportQueue` |
| Notifications | `Notification` model, `notifyUser`/`notifyRole`, `RoleService.getUsersWithPermission`, `SocketService` (Socket.IO + Redis adapter) |
| Attachments | `UploadService` → Cloudinary (multer memory storage). (Supabase Storage optional later.) |
| Validation | `validate` middleware + Zod schemas |
| Design system | `client/src/design-system/*` + `components/ui/*` |
| UI shell | existing `Layout` (sidebar/topbar/theme), `AuthContext.hasPermission` |

## 1. Folder / module structure

The brief's `/modules` and `/shared` are realized inside the existing `server/` and
`client/` trees (one deployable app, clear domain boundaries). `shared/*` is a thin,
stable re-export layer over existing cross-cutting code so modules never reach into
HRMS internals directly.

```
server/src/
  shared/                         # stable façade over cross-cutting concerns
    auth/index.ts                 # re-exports authenticateToken, AuthRequest
    permissions/index.ts          # re-exports requirePermission, requireAnyPermission,
                                  #   PermissionService, RoleService, PERMISSIONS catalog
    tenancy/index.ts              # re-exports getTenantScope, assertSameCompany
    notifications/index.ts        # re-exports notify helpers + SocketService
    storage/index.ts              # re-exports UploadService
  modules/
    support-desk/
      ticket.controller.ts
      ticket.service.ts           # business logic: create, assign, status transitions
      ticket.routes.ts
      comment.controller.ts  comment.service.ts
      attachment.controller.ts attachment.service.ts
      category.controller.ts category.service.ts
      support-desk.validators.ts  # Zod schemas
      support-desk.events.ts       # socket/event names + notification triggers
      support-desk.types.ts
      index.ts                     # builds & exports the module Router
    ai-engine/
      ai-engine.service.ts         # provider-agnostic classify()/summarize() (wraps existing AI)
      categorization.service.ts    # ticket-categorization use case
      ai.worker.ts                 # BullMQ worker for async AI jobs
      prompts/categorization.prompt.ts
      index.ts
  queues/
    supportQueue.ts                # new BullMQ queue + repeatable/one-off jobs
  prisma/
    schema.prisma                  # (option) keep one file, OR split via prismaSchemaFolder:
    schema/                        #   models/support-desk.prisma  models/core.prisma

client/src/
  shared/
    ui/                            # re-export/extend design-system + components/ui
  modules/
    support-desk/
      pages/        TicketsPage.tsx  TicketDetailPage.tsx  NewTicketPage.tsx  CategoryAdminPage.tsx
      components/   TicketTable.tsx  TicketCard.tsx  StatusBadge.tsx  PriorityBadge.tsx
                    CommentThread.tsx  AttachmentList.tsx  AssigneePicker.tsx  AiCategoryChip.tsx
      api/          supportApi.ts    # uses services/api.ts
      hooks/        useTickets.ts  useTicket.ts
      types.ts
```

**Mounting:** `server/src/index.ts` adds `app.use('/api/support', supportDeskRouter)`.
`client/src/App.tsx` adds `/support/*` routes; `Layout` gains a permission-gated nav group.

## 2. Prisma schema design

Conventions follow the existing schema (`String @id @default(uuid())`, `companyId`
scoping, `createdAt/updatedAt`). Use **Prisma enums** for the bounded ticket state
fields (clearer than the HRMS's string-status convention; safe because values are fixed).

> **(Q) HRMS Department ≠ Support Department.** The HRMS `Department` is *organizational*
> (where an employee sits in the org chart). Support Desk introduces its own
> **`SupportDepartment`** (operational queue: IT, HR, Facilities, Payroll…), fully
> admin-created per company. **Tickets route to a `SupportDepartment`, not the HRMS
> `Department`.** The two are independent — an employee in the "Sales" HRMS department can
> file into the "IT" support queue. Org context, if needed for analytics, is derived from
> the requester's profile, not from ticket routing.

```prisma
enum TicketStatus       { OPEN  IN_PROGRESS  ON_HOLD  RESOLVED  CLOSED  REOPENED }
enum TicketPriority     { LOW  MEDIUM  HIGH  URGENT }
enum TicketSource       { WEB  MOBILE  EMAIL  WHATSAPP  SLACK  TEAMS  SYSTEM  AI_AGENT }   // (3)
enum CommentVisibility  { PUBLIC  INTERNAL  ADMIN_ONLY }                                   // (1) PUBLIC=requester sees; INTERNAL=agents; ADMIN_ONLY=admins
enum SlaStatus          { NONE  ON_TRACK  AT_RISK  BREACHED  PAUSED }                      // (5) fields now, logic Phase 2
enum AiProcessingStatus { PENDING  PROCESSING  COMPLETED  FAILED  SKIPPED }                // (7)
enum AssignmentType     { MANUAL  AUTO  AI  ROUND_ROBIN  ESCALATION }                      // (F1) how assignment happened
enum WatcherType        { MANUAL  AUTO  MENTION  DEPARTMENT }                              // (F2) DEPARTMENT = future
enum TicketRelationType { DUPLICATES  RELATED  BLOCKS  PARENT_CHILD  INCIDENT_LINK }       // (F3) future-ready
enum SupportQueueVisibility { PUBLIC  INTERNAL  RESTRICTED }                               // (Q) PUBLIC=any employee can file; INTERNAL=agents only; RESTRICTED=specific roles
enum TicketActivityType {                                                                  // (2) full timeline
  CREATED  STATUS_CHANGED  PRIORITY_CHANGED  ASSIGNED  UNASSIGNED  CATEGORY_CHANGED
  COMMENT_ADDED  ATTACHMENT_ADDED  AI_CATEGORIZED  REOPENED  SLA_BREACHED  DELETED  RESTORED
  WATCHER_ADDED  WATCHER_REMOVED  MENTIONED  LINKED  UNLINKED
}

// (Q) Operational support queue — admin-created per company. The routing target for
// tickets. Owns its categories, default assignee, visibility, and (future) SLA/automation.
model SupportDepartment {
  id                String                @id @default(uuid())
  companyId         String
  name              String
  description       String?
  icon              String?                              // service-tile icon (name/emoji)
  color             String?                              // service-tile accent (hex/token)
  isActive          Boolean               @default(true)
  defaultAssigneeId String?                              // queue default owner/agent
  visibility        SupportQueueVisibility @default(PUBLIC)
  sortOrder         Int                   @default(0)    // tile/order in employee picker
  deletedAt         DateTime?                            // soft delete (§13)
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  company           Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  defaultAssignee   User?            @relation("QueueDefaultAssignee", fields: [defaultAssigneeId], references: [id])
  categories        TicketCategory[]
  tickets           Ticket[]
  visibleToRoles    SupportQueueRole[]                   // (Q5) RESTRICTED visibility → allowed AccessRoles
  // Forward hooks (FUTURE, no logic/tables built in P1): SLA policies and automation
  // rules attach by supportDepartmentId — e.g. SupportSlaPolicy / SupportAutomationRule.

  @@unique([companyId, name])
  @@index([companyId, isActive, sortOrder])
}

// (Q5) Role-based queue visibility (only meaningful when visibility = RESTRICTED).
// Maps a queue to the AccessRoles allowed to see/file into it.
model SupportQueueRole {
  id                  String            @id @default(uuid())
  supportDepartmentId String
  accessRoleId        String
  supportDepartment   SupportDepartment @relation(fields: [supportDepartmentId], references: [id], onDelete: Cascade)
  accessRole          AccessRole        @relation(fields: [accessRoleId], references: [id], onDelete: Cascade)
  @@unique([supportDepartmentId, accessRoleId])
}

model Ticket {
  id               String             @id @default(uuid())
  ticketNumber     Int                                   // per-company sequence (e.g. #1042 -> "TKT-1042")
  companyId        String
  subject          String
  description      String
  status           TicketStatus       @default(OPEN)
  priority         TicketPriority     @default(MEDIUM)
  source           TicketSource       @default(WEB)
  requesterId      String                                // employee who raised it
  assigneeId       String?                               // agent (nullable until assigned)
  supportDepartmentId String?                            // (Q) routing queue — set by tile pick or AI routing (§7)
  categoryId       String?                               // (4) OPTIONAL secondary classification under the queue

  // (6) Searchability — denormalized on write; Postgres FTS now, vector-ready later (§12)
  normalizedTitle  String?                               // lowercased/trimmed subject for fast prefix/sort
  searchableContent String?                              // subject + description (+latest comments) for FTS tsvector
  tags             String[]           @default([])

  // (7) AI lifecycle on the ticket itself (+ richer audit in AiJob)
  aiStatus         AiProcessingStatus @default(PENDING)
  aiCategorized    Boolean            @default(false)
  aiConfidence     Float?

  // (5) SLA-compatible fields now (NO SLA logic in Phase 1)
  firstResponseAt  DateTime?                             // set on first PUBLIC agent reply
  dueAt            DateTime?                             // SLA target (renamed from slaDueAt)
  resolvedAt       DateTime?
  closedAt         DateTime?
  slaStatus        SlaStatus          @default(NONE)

  // (4) Soft delete
  deletedAt        DateTime?
  deletedById      String?

  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  company       Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requester     User                @relation("TicketRequester", fields: [requesterId], references: [id])
  assignee      User?               @relation("TicketAssignee", fields: [assigneeId], references: [id])
  category        TicketCategory?    @relation(fields: [categoryId], references: [id])
  supportDepartment SupportDepartment? @relation(fields: [supportDepartmentId], references: [id])
  comments        TicketComment[]
  attachments     TicketAttachment[]
  activities      TicketActivity[]
  watchers        TicketWatcher[]
  assignmentHistory TicketAssignment[]
  relationsFrom   TicketRelationship[] @relation("TicketRelSource")
  relationsTo     TicketRelationship[] @relation("TicketRelTarget")
  aiJobs          AiJob[]

  @@unique([companyId, ticketNumber])
  @@index([companyId, status, deletedAt])
  @@index([companyId, assigneeId])
  @@index([companyId, supportDepartmentId, status])      // (Q) queue views
  // FTS GIN index on searchableContent added via raw-SQL migration (§12).
}

// (4) Category = OPTIONAL secondary classification, scoped UNDER a SupportDepartment.
model TicketCategory {
  id                  String            @id @default(uuid())
  companyId           String
  supportDepartmentId String
  name                String
  description         String?
  isActive            Boolean           @default(true)
  deletedAt           DateTime?                       // soft delete (§13)
  company             Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  supportDepartment   SupportDepartment @relation(fields: [supportDepartmentId], references: [id], onDelete: Cascade)
  tickets             Ticket[]
  @@unique([supportDepartmentId, name])
}

model TicketComment {
  id          String            @id @default(uuid())
  ticketId    String
  authorId    String
  body        String
  // (1) visibility tiers replace the old isInternal boolean:
  //   PUBLIC = requester-visible · INTERNAL = agents only · ADMIN_ONLY = admins only
  visibility  CommentVisibility @default(PUBLIC)
  deletedAt   DateTime?                        // (4) soft delete
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  ticket      Ticket             @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author      User               @relation("TicketCommentAuthor", fields: [authorId], references: [id])
  attachments TicketAttachment[]
  @@index([ticketId])
}

model TicketAttachment {
  id           String    @id @default(uuid())
  ticketId     String
  commentId    String?                          // attached to ticket or a specific comment
  uploadedById String
  fileName     String
  url          String                            // Cloudinary secure URL
  fileType     String
  fileSize     Int
  deletedAt    DateTime?                          // (4) soft delete
  createdAt    DateTime  @default(now())
  ticket       Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  comment      TicketComment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  uploadedBy   User           @relation("TicketAttachmentUploader", fields: [uploadedById], references: [id])
  @@index([ticketId])
}

// (2) Unified activity timeline / audit log — every meaningful change appends a row.
// Replaces the status-only history; powers the ticket detail timeline UI from Day 1.
// `data` holds type-specific JSON (e.g. {from,to} for status, {assigneeId} for assign).
model TicketActivity {
  id        String            @id @default(uuid())
  ticketId  String
  type      TicketActivityType
  actorId   String?                              // null for SYSTEM/AI_AGENT actions
  data      String?                              // JSON payload (stringified)
  createdAt DateTime          @default(now())
  ticket    Ticket            @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actor     User?             @relation("TicketActivityActor", fields: [actorId], references: [id])
  @@index([ticketId, createdAt])
}

// (F2) Followers — manual, auto (requester/assignee/commenter), mention-based, and
// future DEPARTMENT watchers. `type` drives why they follow; `addedById` for audit.
model TicketWatcher {
  id        String      @id @default(uuid())
  ticketId  String
  userId    String
  type      WatcherType @default(MANUAL)
  addedById String?                            // who added them (null for AUTO/system)
  createdAt DateTime    @default(now())
  ticket    Ticket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user      User        @relation("TicketWatcher", fields: [userId], references: [id])
  @@unique([ticketId, userId])
  @@index([ticketId])
}

// (F1) Assignment history — full chain of who was assigned, by whom, why, and how.
// Ticket.assigneeId remains the *current* assignee; this is the immutable log.
model TicketAssignment {
  id             String         @id @default(uuid())
  ticketId       String
  assignedToId   String
  assignedById   String?                        // null when AI/AUTO/system assigned
  assignmentType AssignmentType @default(MANUAL)
  reason         String?
  assignedAt     DateTime       @default(now())
  unassignedAt   DateTime?                       // set when superseded/cleared
  ticket         Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  assignedTo     User           @relation("TicketAssignedTo", fields: [assignedToId], references: [id])
  assignedBy     User?          @relation("TicketAssignedBy", fields: [assignedById], references: [id])
  @@index([ticketId])
}

// (F3) Ticket-to-ticket relationships — FUTURE-READY (schema only in Phase 1, no endpoints).
// Directional; PARENT_CHILD uses source=parent, target=child.
model TicketRelationship {
  id           String            @id @default(uuid())
  companyId    String
  sourceId     String
  targetId     String
  type         TicketRelationType
  createdById  String?
  createdAt    DateTime          @default(now())
  source       Ticket            @relation("TicketRelSource", fields: [sourceId], references: [id], onDelete: Cascade)
  target       Ticket            @relation("TicketRelTarget", fields: [targetId], references: [id], onDelete: Cascade)
  @@unique([sourceId, targetId, type])
  @@index([targetId])
}

model AiJob {                    // ai-engine audit trail (also powers retries/idempotency)
  id          String            @id @default(uuid())
  ticketId    String?
  type        String                              // "CATEGORIZATION" (future: "SUMMARY","SENTIMENT","EMBEDDING")
  provider    String?                             // "groq" | "gemini" | "openai"
  status      AiProcessingStatus @default(PENDING) // (7) PENDING→PROCESSING→COMPLETED|FAILED|SKIPPED
  inputHash   String?
  output      String?                             // JSON result (categoryId, priority, confidence)
  confidence  Float?
  error       String?
  createdAt   DateTime          @default(now())
  completedAt DateTime?
  ticket      Ticket?           @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  @@index([ticketId])
}
```

> **(10) Vector-search seam.** Semantic search is added later **without touching the
> tables above** by introducing a dedicated `TicketEmbedding { ticketId, model, embedding,
> createdAt }` table (pgvector `vector` column) populated by an `ai-engine` `EMBEDDING`
> job. `searchableContent` is already the canonical text to embed. See §12.

**Back-relations added to existing models** (required for Prisma):
- `User`: `ticketsRequested`/`ticketsAssigned Ticket[]`, comment/attachment/activity/watcher and assignment-history (`TicketAssignedTo`/`TicketAssignedBy`) back-relations, plus `QueueDefaultAssignee` (default-assignee for queues).
- `Company`: `tickets Ticket[]`, `supportDepartments SupportDepartment[]`, `ticketCategories TicketCategory[]`.
- `AccessRole`: `supportQueueRoles SupportQueueRole[]` (for RESTRICTED queue visibility).
- HRMS `Department` is **not** linked to tickets (routing moved to `SupportDepartment`).

All additive ⇒ safe `prisma db push` / migration (no drops). `ticketNumber` is a
per-company sequence generated in a transaction (mirrors the HRMS `IdService` pattern).

**Modularity option:** enable Prisma's multi-file schema (`prismaSchemaFolder`) and put
the above in `prisma/schema/support-desk.prisma`, keeping core models separate.

## 3. RBAC integration

Add to the `PERMISSIONS` catalog in `permission.service.ts`:

| Permission | Meaning |
|---|---|
| `CREATE_TICKETS` | raise a ticket (all employees by default) |
| `VIEW_TICKETS` | view own tickets |
| `VIEW_ALL_TICKETS` | view the company queue (agent) |
| `MANAGE_TICKETS` | assign, change status, edit, internal-comment |
| `MANAGE_SUPPORT_DEPARTMENTS` | CRUD support queues + queue visibility/ownership |
| `MANAGE_TICKET_CATEGORIES` | CRUD categories (under a queue) |
| `DELETE_TICKETS` | delete tickets (admin) |

**Default role mapping** (and **backfill existing AccessRoles** — same lesson as the
HRMS rollout: new catalog permissions must be granted to already-seeded roles):
- EMPLOYEE → `CREATE_TICKETS`, `VIEW_TICKETS`
- MANAGER → + `VIEW_ALL_TICKETS`, `MANAGE_TICKETS`
- HR / Agent role → `VIEW_ALL_TICKETS`, `MANAGE_TICKETS`, `MANAGE_TICKET_CATEGORIES`
- ADMIN / Owner → all of the above + `MANAGE_SUPPORT_DEPARTMENTS` + `DELETE_TICKETS`

**Queue-scoped visibility (Q5):** a queue's `visibility` controls who can **file into**
and **see** it — `PUBLIC` (any employee), `INTERNAL` (agents with `VIEW_ALL_TICKETS`),
`RESTRICTED` (only `AccessRole`s in `SupportQueueRole`). The employee service-tile list and
agent queue filters are both intersected with this visibility server-side. (Per-queue agent
*ownership* — restricting an agent to only their queues — is a forward hook; Phase 1 agents
with `VIEW_ALL_TICKETS` see all non-restricted queues in their company.)

Enforcement: routes use `requirePermission(...)`; every query is tenant-scoped via
`getTenantScope` and every by-id fetch validated with `assertSameCompany`. "Own vs all"
is decided in the service: a user without `VIEW_ALL_TICKETS` is restricted to
`requesterId == userId OR assigneeId == userId`. The client gates nav/actions with
`hasPermission(...)` (already returns effective permissions from `/auth/me`).

## 4. Backend architecture

Layered, thin controllers:

```
route (auth + requirePermission + validate)
  → controller (parse req, call service, shape response)
    → service (business rules, tenancy, transitions, enqueues AI/notifications)
      → prisma (data)  +  shared/* (auth, notifications, storage, ai-engine)
```

`ticket.service.ts` owns:
- **Create:** allocate `ticketNumber` (tx), persist `OPEN`, write initial `StatusHistory`,
  enqueue `ai-categorize`, fire "created" notifications.
- **Assign:** set `assigneeId` (validate same-company agent with `VIEW_ALL_TICKETS`), notify.
- **Status transition state machine** (rejects illegal moves):
  `OPEN → IN_PROGRESS|ON_HOLD|RESOLVED|CLOSED`, `IN_PROGRESS → ON_HOLD|RESOLVED|CLOSED`,
  `ON_HOLD → IN_PROGRESS|RESOLVED|CLOSED`, `RESOLVED → CLOSED|REOPENED`,
  `CLOSED → REOPENED`. Sets `resolvedAt`/`closedAt`; writes `StatusHistory`.
- **Visibility scoping** (own vs all) and internal-comment gating.

## 5. API contracts

Base path `/api/support`. All require `authenticateToken`; tenant-scoped.

| Method & path | Permission | Body / query | Returns |
|---|---|---|---|
| `GET /departments` | authenticated | — | visible `SupportDepartment[]` (tile picker; filtered by visibility/role) |
| `POST/PUT/DELETE /departments[/:id]` | MANAGE_SUPPORT_DEPARTMENTS | `{name, description?, icon?, color?, defaultAssigneeId?, visibility?, sortOrder?, roleIds?}` | `SupportDepartment` |
| `POST /tickets` | CREATE_TICKETS | `{subject, description, supportDepartmentId?, priority?, categoryId?}` | 201 `Ticket` (AI routes dept/category/priority async) |
| `GET /tickets` | VIEW_TICKETS* | `?status&priority&assigneeId&categoryId&q&page&pageSize` | `{ data: Ticket[], total }` (scoped own/all) |
| `GET /tickets/:id` | VIEW_TICKETS* | — | `Ticket` (+ comments, attachments, history) |
| `PATCH /tickets/:id` | MANAGE_TICKETS | `{subject?, priority?, categoryId?, departmentId?}` | `Ticket` |
| `POST /tickets/:id/assign` | MANAGE_TICKETS | `{assigneeId, reason?}` | `Ticket` (appends `TicketAssignment`, closes prior `unassignedAt`) |
| `GET /tickets/:id/assignments` | VIEW_ALL_TICKETS | — | `Assignment[]` (history chain) |
| `POST /tickets/:id/watchers` | participant | `{userId?}` (self if omitted) | 201 `Watcher` (type MANUAL) |
| `DELETE /tickets/:id/watchers/:userId` | self \| MANAGE_TICKETS | — | 200 |
| `POST /tickets/:id/status` | MANAGE_TICKETS** | `{status, note?}` | `Ticket` |
| `DELETE /tickets/:id` | DELETE_TICKETS | — | 200 (soft delete — sets `deletedAt`, §13) |
| `POST /tickets/:id/restore` | DELETE_TICKETS | — | `Ticket` (clears `deletedAt`) |
| `GET /tickets/:id/activity` | VIEW_TICKETS* | — | `Activity[]` (unified timeline, §14) |
| `GET /tickets/:id/comments` | VIEW_TICKETS* | — | `Comment[]` (visibility-filtered, see below) |
| `POST /tickets/:id/comments` | participant | `{body, visibility?}` | 201 `Comment` (INTERNAL/ADMIN_ONLY ⇒ MANAGE_TICKETS) |
| `POST /tickets/:id/attachments` | participant | multipart `file` | 201 `Attachment` |
| `GET /departments/:deptId/categories` | VIEW_ALL_TICKETS \| MANAGE_TICKET_CATEGORIES | — | `Category[]` (scoped to the queue) |
| `POST/PUT/DELETE /departments/:deptId/categories[/:id]` | MANAGE_TICKET_CATEGORIES | `{name, description?}` | `Category` |

\* own-only unless `VIEW_ALL_TICKETS`. \*\* requester may `RESOLVED→REOPENED`/`→CLOSED`
on their own ticket. Errors use the existing global handler shape `{ message, errors? }`.

**Search (6):** `GET /tickets?q=...` runs Postgres full-text over `searchableContent`
(+ `tags` filter via `?tags=`). Same endpoint shape stays when semantic search is added
(§12) — `?mode=semantic` swaps the backing query, response contract unchanged.
**Comment visibility (1):** `GET .../comments` returns `PUBLIC` to everyone on the ticket;
`INTERNAL` only to holders of `MANAGE_TICKETS`; `ADMIN_ONLY` only to `DELETE_TICKETS`/admins.
**Soft delete (4):** `DELETE` never hard-deletes; list/detail endpoints exclude
`deletedAt != null` by default (admin can pass `?includeDeleted=true`).
**Followers (F2):** auto-followers (requester, assignee, commenters) and mention-followers
(`@user` in a comment body) are created **server-side** by the service — only MANUAL
follow/unfollow is exposed via the endpoints above. DEPARTMENT watchers are future.
**Relationships (F3) — DEFERRED:** the `TicketRelationship` schema exists for forward
compatibility, but **no link/unlink endpoints ship in Phase 1**. When enabled:
`POST /tickets/:id/links {targetId, type}` + `DELETE /tickets/:id/links/:linkId`
(`MANAGE_TICKETS`), logging `LINKED`/`UNLINKED` activity.
**Queue routing (Q):** `supportDepartmentId` may be set by the employee (tile pick) or left
null for AI routing (§7). `GET /departments` returns only queues the caller may file into
(visibility + role filtered, ordered by `sortOrder`). Changing a ticket's queue is a
`PATCH /tickets/:id {supportDepartmentId}` (MANAGE_TICKETS) and logs `CATEGORY_CHANGED`-style
activity; reassigning to the new queue's `defaultAssignee` is optional.

## 6. Notification flow

Reuses `NotificationService` (DB `Notification`), `SocketService` (real-time), and
`RoleService.getUsersWithPermission(companyId, 'VIEW_ALL_TICKETS')` to target agents.

| Event | Recipients | Channels |
|---|---|---|
| Ticket created | assignee (if any) + agents (VIEW_ALL_TICKETS) | in-app + socket `ticket:created` |
| Assigned | new assignee | in-app + socket + (optional email) |
| New public comment | requester + assignee + watchers | in-app + socket `ticket:comment` |
| Status changed | requester (+ assignee) | in-app + socket `ticket:updated` |
| INTERNAL note | assignee + agents (`MANAGE_TICKETS`) — never requester | in-app + socket |
| ADMIN_ONLY note | admins (`DELETE_TICKETS`) only | in-app + socket |

Socket rooms reuse the existing per-user (`user_<id>`) and per-company (`company_<id>`)
rooms. Notification dispatch is fire-and-forget from the service (never blocks the request).
**Every one of these events also appends a `TicketActivity` row (§14)** in the same
service call, so the audit timeline and notifications stay in lock-step.

## 7. AI routing & categorization flow

Async so ticket creation never waits on the LLM. AI determines **support department
(routing) + category + priority** in one pass:

```
POST /tickets ──► ticket.service.create() ──► supportQueue.add('ai-categorize', { ticketId })
                                                         │
ai.worker (BullMQ) ◄─────────────────────────────────────┘
  ticket.aiStatus: PENDING ─► PROCESSING ─► COMPLETED | FAILED | SKIPPED   // (7)
  0. SKIPPED early-exit if feature flag off (§11) or company has no active SupportDepartments
     → set aiStatus=SKIPPED, AiJob.status=SKIPPED, stop.
  1. set aiStatus=PROCESSING; load ticket + company's active SupportDepartment[] (+ each
     queue's TicketCategory[])
  2. routing.service.classify(subject, description, queues, categories)
       → ai-engine.service picks provider (company `ai_provider` setting) → calls LLM
       → returns { supportDepartmentId, categoryId, suggestedPriority, confidence }
  3. persist AiJob (audit). If confidence ≥ threshold, update ticket (RESPECTING human input):
       - supportDepartmentId → only if the employee left it null (tile pick always wins)
       - categoryId          → only if null and belongs to the chosen queue
       - priority            → only if user left the default
       - aiCategorized=true, aiConfidence, aiStatus=COMPLETED
     else: aiStatus=COMPLETED but route to the company's fallback/"General" queue for
     manual triage. On provider error after retries: aiStatus=FAILED, AiJob.error set.
  4. append TicketActivity(AI_CATEGORIZED); emit socket `ticket:updated`; notify the
     resolved queue's agents (+ defaultAssignee)
```

`AiProcessingStatus` is shared across all future AI job types (summary, sentiment,
embedding) — the same lifecycle drives every `ai-engine` use case.

`ai-engine` exposes a **provider-agnostic contract** (`classify(input, options)` /
`summarize(text)`) and knows nothing about tickets beyond what's passed in — so it's
reusable for future AI features. Existing provider code in `ai.controller.ts` is
extracted into `ai-engine.service.ts`. BullMQ gives retries + idempotency
(`AiJob.inputHash`); failure degrades gracefully to manual categorization.

## 8. Frontend architecture — two distinct UX surfaces (9)

Both render inside the existing `Layout` (sidebar/topbar/theme) and use the design
system, but they are **separate route trees, folders, and component sets** — an employee
must never see agent tooling, and the bundle for each is isolated.

```
client/src/modules/support-desk/
  employee/         # Employee UX — self-service, minimal, service-tile-first
    pages/      MyTicketsPage.tsx  NewTicketPage.tsx  MyTicketDetailPage.tsx
    components/ ServiceTileGrid (icon+color queue tiles)  TicketComposer (minimal)
                MyTicketCard  StatusTracker  (read-only timeline, PUBLIC comments)
  admin/            # Agent/Admin UX — operational console
    pages/      TicketQueuePage.tsx  TicketConsolePage.tsx  CategoryAdminPage.tsx
    components/ QueueTable(filters/bulk)  AssigneePicker  InternalNoteEditor(visibility)
                FullActivityTimeline  AiCategoryChip  PriorityEditor
  shared/           # used by both (StatusBadge, PriorityBadge, AttachmentList, ticket types)
  api/  supportApi.ts     hooks/  useTickets.ts useTicket.ts useTicketActivity.ts
```

| Surface | Routes | Gate | Capabilities |
|---|---|---|---|
| **Employee** | `/support`, `/support/new`, `/support/tickets/:id` | `CREATE_TICKETS` / `VIEW_TICKETS` | **pick a service tile (queue)** → minimal form (subject/description/attachments); track own, PUBLIC comments, status tracker |
| **Admin/Agent** | `/support/console`, `/support/console/:id`, `/support/categories` | `VIEW_ALL_TICKETS` / `MANAGE_TICKETS` / `MANAGE_TICKET_CATEGORIES` | queue + filters, assign, change status/priority, INTERNAL/ADMIN_ONLY notes, full timeline, manage categories |

- **Service-tile flow (6):** the employee "New Ticket" entry is a **grid of service tiles**
  (one per visible `SupportDepartment`, rendered from `icon`/`color`/`name`, ordered by
  `sortOrder`) — not a form full of dropdowns. Selecting a tile picks the queue
  (`supportDepartmentId`) and opens a minimal composer (subject, description, attachments).
  Category/priority are **optional** and AI-suggested (§7/§15), so the employee rarely
  touches them. Admin/agent console keeps richer forms (compact density).
- **Nav** (`Layout`, gated by `hasPermission`): "Support" (employee) shown to `CREATE_TICKETS`;
  "Support Console" shown to `VIEW_ALL_TICKETS`; "Categories" to `MANAGE_TICKET_CATEGORIES`.
- **Data:** `supportApi.ts` over the shared `api` service; the same endpoints serve both
  surfaces — the **backend** decides own-vs-all scope and comment-visibility filtering, so
  the UIs never rely on client-side trust.
- **Real-time (additive):** the client has **no** `socket.io-client` yet — Phase 1 ships
  with fetch-on-action/refetch; a small `SocketContext` (subscribing to `ticket:*` events)
  can be layered in later without touching the server.
- **Feature-flag gate:** both route trees + nav are wrapped by the client feature flag (§11);
  if Support Desk is off for a company, nothing renders.
- **UI density (4):** two density modes driven by a `density` token (`comfortable` |
  `compact`), persisted per-user (localStorage + profile pref). **Employee UX defaults to
  `comfortable`** (roomy spacing, larger touch targets, card-based); **Admin/Agent console
  defaults to `compact`** (tight row heights, denser tables, more rows per screen for
  triage). A density toggle in the topbar lets either surface switch. Implemented purely
  with design-system spacing tokens / Tailwind classes — no component forks.

## 9. Module boundaries & dependency rules

```
client/server modules ──► shared/* ──► HRMS core (User/Company/Dept/AccessRole)
support-desk ──► ai-engine (via classify() contract only)
```
- Dependencies point **one way**: `support-desk → shared → core`. HRMS core must never
  import support-desk. `ai-engine` has no ticket knowledge (generic AI contract).
- Each module owns its router and mounts under its own prefix; no cross-module imports
  except through `shared/*`.
- One Postgres / one Prisma client; support-desk models are logically grouped (optionally
  a separate `.prisma` file). Tickets relate to core entities by FK (the whole reason for
  Postgres over Mongo).

## 10. Phase 1 build order

1. Schema + permissions catalog + backfill (additive `db push`); seed a default "General"
   `SupportDepartment` per company.
2. `shared/*` façade; **SupportDepartment + Category CRUD** (admin queues) with
   visibility/RBAC.
3. `support-desk` ticket CRUD (routes to queue) + status state machine + activity writes.
4. Comments (visibility) + attachments (reuse `UploadService`).
5. Notifications wiring (queue agents + defaultAssignee + watchers).
6. `ai-engine` extraction + `supportQueue` + `ai-route` worker (dept+category+priority).
7. Frontend: employee **service-tile** flow + admin console + nav + permission gating + density.
8. (Optional) client `socket.io-client` for live updates.

Build order now also includes: (a) feature-flag gate before mounting routes/nav,
(b) `TicketActivity` writes alongside every mutation, (c) the FTS index migration, and
(d) backfilling the new ticket permissions into existing `AccessRole`s.

**Deferred (not built):** SLA logic, analytics, knowledge base, duplicate detection,
auto-replies, sentiment, AI summaries, semantic/vector search — schema/contracts leave
room (§12) but no implementation.

## 11. Feature-flag strategy (8)

Phased, reversible rollout with a single resolver — no scattered `if`s.

- **`shared/feature-flags.ts`** exposes `isEnabled(flag, companyId)`. Resolution order:
  per-company override (a `FeatureFlag { companyId, key, enabled }` row, or reuse the
  existing `SystemSetting` key/value) → env default (`SUPPORT_DESK_ENABLED`,
  `SUPPORT_AI_CATEGORIZATION_ENABLED`) → hard default `false`.
- **Gating points:**
  - Backend: a `featureFlag('SUPPORT_DESK')` middleware guards the `/api/support` mount
    (returns 404 when off, so the surface is invisible).
  - AI: the categorization worker checks `SUPPORT_AI_CATEGORIZATION` → else `SKIPPED` (§7).
  - Frontend: `/auth/me` returns the company's enabled flags; `AuthContext` exposes
    `hasFeature(flag)`; nav + route trees (§8) render only when enabled.
- Lets us ship to one tenant, dark-launch AI, or kill-switch a sub-feature without deploys.

## 12. Search & semantic/vector readiness (6, 10)

**Phase 1 (now):** keyword search via Postgres FTS over `searchableContent`
(denormalized subject+description+latest public comments, refreshed on write) + `tags`
filtering + `normalizedTitle` for fast sort/prefix. A `tsvector` GIN index is added via a
raw-SQL migration (Prisma can't express it natively).

**Later (no schema rewrite of ticket tables):** enable the pgvector extension and add a
**separate** `TicketEmbedding { id, ticketId, model, embedding vector, createdAt }` table,
populated by an `ai-engine` `EMBEDDING` job off the same `searchableContent`. The search
endpoint (§5) already abstracts the backing query — `?mode=semantic` performs an ANN
lookup and joins back to tickets. Because embeddings live in their own table and the
text-to-embed already exists, adding semantic/hybrid search is **purely additive**.

## 13. Soft-delete strategy (4)

- Every deletable entity (`Ticket`, `TicketComment`, `TicketAttachment`, `TicketCategory`)
  carries `deletedAt DateTime?` (Ticket also `deletedById`). No physical deletes in Phase 1.
- A **centralized scoping helper** (`notDeleted()` → `{ deletedAt: null }`, or a Prisma
  Client extension) is applied to all list/detail reads so soft-deleted rows are excluded
  by default; admins opt in with `?includeDeleted=true`.
- `DELETE` endpoints set `deletedAt`/`deletedById` and append `TicketActivity(DELETED)`;
  `restore` clears it and logs `RESTORED`. Cascade rules still hard-delete children only
  when a parent is *physically* removed (not used in P1).

## 14. Activity timeline & audit (2)

`TicketActivity` is written **from Day 1** for every meaningful change (create, status,
priority, assign/unassign, category, comment, attachment, AI categorization, delete/restore,
SLA breach later). It is the single source for the ticket-detail timeline UI and the audit
trail. Writes happen in the same service method as the mutation (best-effort, never blocks
the response), mirroring the HRMS `AuditService` pattern. `actorId` is null for SYSTEM /
AI_AGENT actions; `data` carries type-specific JSON (e.g. `{from,to}` for status changes).
This supersedes a status-only history table so the timeline is complete without rework.

Assignment, follower, mention, and link changes are all timeline events too
(`ASSIGNED`/`UNASSIGNED`, `WATCHER_ADDED`/`WATCHER_REMOVED`, `MENTIONED`,
`LINKED`/`UNLINKED`). The **detailed** assignment chain (who/by-whom/why/type) lives in
`TicketAssignment` (§F1); the timeline row references it and shows a human summary. So the
timeline is the narrative view, and the dedicated tables (`TicketAssignment`,
`TicketWatcher`, `TicketRelationship`) are the queryable structured truth.

## 15. AI interaction guidelines — ambient, not chatbot-first (5)

AI in Support Desk is **ambient and invisible-by-default** — it augments the existing
workflow, it does not introduce a conversational agent as the primary surface.

- **Ambient AI:** AI output appears *in place* within normal UI — a category **suggestion
  chip** on the ticket, a subtle "suggested priority" hint, "possible duplicates" inline
  (when F3 ships) — never a separate "AI panel" the user must visit.
- **Invisible assistance:** auto-categorization runs in the background (async worker, §7).
  The user sees a *result*, not a spinner or a prompt. If AI hasn't run yet, the UI simply
  shows "uncategorized" — no broken/loading-AI states block the human.
- **Proactive but dismissible:** suggestions are presented proactively (pre-filled category,
  recommended assignee later) yet always **overridable and dismissible**; a human decision
  always wins and is recorded in the timeline (`AI_CATEGORIZED` vs a later human change).
- **Confidence-gated:** low-confidence AI output is withheld rather than shown noisily
  (ties to the §7 threshold + `SKIPPED`/`COMPLETED` lifecycle).
- **Avoid chatbot-first:** **no** "chat with the helpdesk bot" as the entry point in Phase 1.
  The existing HRMS `AiAssistant` chat (if surfaced) stays a secondary, opt-in helper —
  Support Desk's AI value is delivered through ambient cues on tickets, not a chat window.
- **Transparent + auditable:** every AI action is attributable (`AiJob` record, `actorId=null`
  / AI_AGENT in the timeline) so users can see what was AI-decided vs human-decided.

These principles constrain the frontend (§8): AI surfaces as chips/hints inside the
employee and admin views, governed by the same feature flags (§11) so AI assistance can be
dark-launched or disabled per company without removing the manual workflow.
