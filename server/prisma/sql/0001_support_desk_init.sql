◇ injected env (18) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WEB', 'MOBILE', 'EMAIL', 'WHATSAPP', 'SLACK', 'TEAMS', 'SYSTEM', 'AI_AGENT');

-- CreateEnum
CREATE TYPE "CommentVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "SlaStatus" AS ENUM ('NONE', 'ON_TRACK', 'AT_RISK', 'BREACHED', 'PAUSED');

-- CreateEnum
CREATE TYPE "AiProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('MANUAL', 'AUTO', 'AI', 'ROUND_ROBIN', 'ESCALATION');

-- CreateEnum
CREATE TYPE "WatcherType" AS ENUM ('MANUAL', 'AUTO', 'MENTION', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "TicketRelationType" AS ENUM ('DUPLICATES', 'RELATED', 'BLOCKS', 'PARENT_CHILD', 'INCIDENT_LINK');

-- CreateEnum
CREATE TYPE "SupportQueueVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "TicketActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'CATEGORY_CHANGED', 'COMMENT_ADDED', 'ATTACHMENT_ADDED', 'AI_CATEGORIZED', 'REOPENED', 'SLA_BREACHED', 'DELETED', 'RESTORED', 'WATCHER_ADDED', 'WATCHER_REMOVED', 'MENTIONED', 'LINKED', 'UNLINKED');

-- CreateTable
CREATE TABLE "SupportDepartment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultAssigneeId" TEXT,
    "visibility" "SupportQueueVisibility" NOT NULL DEFAULT 'PUBLIC',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportQueueRole" (
    "id" TEXT NOT NULL,
    "supportDepartmentId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,

    CONSTRAINT "SupportQueueRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supportDepartmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "companyId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "source" "TicketSource" NOT NULL DEFAULT 'WEB',
    "requesterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "supportDepartmentId" TEXT,
    "categoryId" TEXT,
    "normalizedTitle" TEXT,
    "searchableContent" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiStatus" "AiProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "aiCategorized" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "firstResponseAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaStatus" "SlaStatus" NOT NULL DEFAULT 'NONE',
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "CommentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "commentId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "TicketActivityType" NOT NULL,
    "actorId" TEXT,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketWatcher" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WatcherType" NOT NULL DEFAULT 'MANUAL',
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignmentType" "AssignmentType" NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketRelationship" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "TicketRelationType" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "status" "AiProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "inputHash" TEXT,
    "output" TEXT,
    "confidence" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportDepartment_companyId_isActive_sortOrder_idx" ON "SupportDepartment"("companyId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SupportDepartment_companyId_name_key" ON "SupportDepartment"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SupportQueueRole_supportDepartmentId_accessRoleId_key" ON "SupportQueueRole"("supportDepartmentId", "accessRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_supportDepartmentId_name_key" ON "TicketCategory"("supportDepartmentId", "name");

-- CreateIndex
CREATE INDEX "Ticket_companyId_status_deletedAt_idx" ON "Ticket"("companyId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Ticket_companyId_assigneeId_idx" ON "Ticket"("companyId", "assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_companyId_supportDepartmentId_status_idx" ON "Ticket"("companyId", "supportDepartmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_companyId_ticketNumber_key" ON "Ticket"("companyId", "ticketNumber");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_createdAt_idx" ON "TicketActivity"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketWatcher_ticketId_idx" ON "TicketWatcher"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketWatcher_ticketId_userId_key" ON "TicketWatcher"("ticketId", "userId");

-- CreateIndex
CREATE INDEX "TicketAssignment_ticketId_idx" ON "TicketAssignment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketRelationship_targetId_idx" ON "TicketRelationship"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRelationship_sourceId_targetId_type_key" ON "TicketRelationship"("sourceId", "targetId", "type");

-- CreateIndex
CREATE INDEX "AiJob_ticketId_idx" ON "AiJob"("ticketId");

-- AddForeignKey
ALTER TABLE "SupportDepartment" ADD CONSTRAINT "SupportDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportDepartment" ADD CONSTRAINT "SupportDepartment_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportQueueRole" ADD CONSTRAINT "SupportQueueRole_supportDepartmentId_fkey" FOREIGN KEY ("supportDepartmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportQueueRole" ADD CONSTRAINT "SupportQueueRole_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_supportDepartmentId_fkey" FOREIGN KEY ("supportDepartmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_supportDepartmentId_fkey" FOREIGN KEY ("supportDepartmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TicketComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketWatcher" ADD CONSTRAINT "TicketWatcher_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketWatcher" ADD CONSTRAINT "TicketWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRelationship" ADD CONSTRAINT "TicketRelationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRelationship" ADD CONSTRAINT "TicketRelationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

