import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { RoleService } from '../../shared/permissions';
import type { JwtPayload } from '../../shared/auth';
import { UploadService } from '../../services/upload.service';
import { SupportDepartmentService } from './support-department.service';
import { TicketCategoryService } from './ticket-category.service';
import { TicketActivityService } from './activity.service';
import { canTransition, isReopen, TicketStatusValue } from './ticket-status';
import { SupportNotifier } from './notifications';
import { serializeTicketForEmployee, serializeTicketForAgent } from './serializers';

interface CreateTicketInput {
    subject: string;
    description: string;
    supportDepartmentId: string;
    categoryId?: string | null;
}

interface UploadedFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

const queueSelect = { select: { id: true, name: true, icon: true, color: true } };
const categorySelect = { select: { id: true, name: true } };
const userSelect = { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } };

const detailInclude = {
    supportDepartment: queueSelect,
    category: categorySelect,
    attachments: { where: { deletedAt: null }, select: { id: true, fileName: true, url: true, fileType: true, fileSize: true } },
    requester: userSelect,
    assignee: userSelect,
    comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' as const },
        include: {
            author: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
            attachments: { where: { deletedAt: null } },
        },
    },
};

export class TicketService {
    static async create(user: JwtPayload, input: CreateTicketInput, files: UploadedFile[]) {
        const companyId = requireCompany(user);

        // Queue must exist, be in-company, and be visible to the caller.
        await SupportDepartmentService.assertUsable(user, input.supportDepartmentId);
        // Optional category must belong to that queue.
        if (input.categoryId) {
            await TicketCategoryService.assertInQueue(companyId, input.supportDepartmentId, input.categoryId);
        }

        // Upload attachments FIRST (external I/O — never inside the DB tx). A
        // storage failure aborts the whole create (no ticket; clean 502).
        const uploaded = [] as { fileName: string; url: string; fileType: string; fileSize: number }[];
        for (const f of files) {
            try {
                const url = await UploadService.uploadDocument(f.buffer, f.originalname, `support/${companyId}`);
                uploaded.push({ fileName: f.originalname, url, fileType: f.mimetype, fileSize: f.size });
            } catch {
                throw new AppError('Attachment upload failed. Please try again.', 502);
            }
        }

        const ticket = await this.createWithNumber(companyId, user.userId, input, uploaded);
        SupportNotifier.onCreated(ticket); // fire-and-forget: notify queue agents
        return serializeTicketForEmployee(ticket);
    }

    /** Allocate the per-company ticketNumber + create ticket/attachments/activity atomically. */
    private static async createWithNumber(
        companyId: string,
        requesterId: string,
        input: CreateTicketInput,
        uploaded: { fileName: string; url: string; fileType: string; fileSize: number }[],
        attempt = 1,
    ): Promise<any> {
        try {
            return await prisma.$transaction(async (tx) => {
                const last = await tx.ticket.findFirst({
                    where: { companyId },
                    orderBy: { ticketNumber: 'desc' },
                    select: { ticketNumber: true },
                });
                const ticketNumber = (last?.ticketNumber ?? 0) + 1;
                const ticket = await tx.ticket.create({
                    data: {
                        companyId,
                        ticketNumber,
                        subject: input.subject,
                        description: input.description,
                        requesterId,
                        supportDepartmentId: input.supportDepartmentId,
                        categoryId: input.categoryId ?? null,
                        normalizedTitle: input.subject.trim().toLowerCase(),
                        searchableContent: `${input.subject}\n${input.description}`,
                        // status OPEN, priority MEDIUM, source WEB, aiStatus PENDING — schema defaults
                        attachments: uploaded.length
                            ? { create: uploaded.map((a) => ({ ...a, uploadedById: requesterId })) }
                            : undefined,
                    },
                    include: detailInclude,
                });
                await TicketActivityService.record(tx, { ticketId: ticket.id, type: 'CREATED', actorId: requesterId });
                return ticket;
            });
        } catch (err: any) {
            // Concurrent ticketNumber collision — retry a bounded number of times.
            if (err?.code === 'P2002' && attempt < 5) {
                return this.createWithNumber(companyId, requesterId, input, uploaded, attempt + 1);
            }
            throw err;
        }
    }

    /** List tickets scoped by permission: own-only unless VIEW_ALL_TICKETS. */
    static async list(
        user: JwtPayload,
        filters: { status?: string; supportDepartmentId?: string } = {},
    ) {
        const companyId = requireCompany(user);
        const canViewAll = await RoleService.hasPermission(user, 'VIEW_ALL_TICKETS');

        const where: any = { companyId, deletedAt: null };
        if (!canViewAll) {
            // Employees see only their own (requested or assigned). Future: queue
            // ownership can further narrow agents to their assigned queues.
            where.OR = [{ requesterId: user.userId }, { assigneeId: user.userId }];
        }
        if (filters.status) where.status = filters.status;
        if (filters.supportDepartmentId) where.supportDepartmentId = filters.supportDepartmentId;

        const tickets = await prisma.ticket.findMany({
            where,
            select: {
                id: true, ticketNumber: true, subject: true, status: true, priority: true,
                createdAt: true, updatedAt: true, requesterId: true, assigneeId: true,
                supportDepartment: queueSelect, category: categorySelect,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return tickets;
    }

    static async getById(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        const ticket = await prisma.ticket.findUnique({ where: { id }, include: detailInclude });
        if (!ticket || ticket.deletedAt || ticket.companyId !== companyId) throw new AppError('Ticket not found', 404);

        const canViewAll = await RoleService.hasPermission(user, 'VIEW_ALL_TICKETS');
        const isParticipant = ticket.requesterId === user.userId || ticket.assigneeId === user.userId;
        if (!canViewAll && !isParticipant) throw new AppError('Access denied', 403);

        return this.serializeForCaller(user, ticket);
    }

    /** POST status change with central transition rules + optimistic concurrency. */
    static async changeStatus(user: JwtPayload, id: string, toStatus: TicketStatusValue, note?: string) {
        const companyId = requireCompany(user);
        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket || ticket.deletedAt || ticket.companyId !== companyId) throw new AppError('Ticket not found', 404);

        const from = ticket.status as TicketStatusValue;
        const canManage = await RoleService.hasPermission(user, 'MANAGE_TICKETS');
        const isRequester = ticket.requesterId === user.userId;
        // Requesters may only reopen their own resolved/closed tickets.
        if (!canManage && !(isRequester && isReopen(from, toStatus))) throw new AppError('Access denied', 403);
        if (!canTransition(from, toStatus)) throw new AppError(`Cannot move ticket from ${from} to ${toStatus}`, 409);

        const data: any = { status: toStatus };
        if (toStatus === 'RESOLVED') data.resolvedAt = new Date();
        else if (toStatus === 'CLOSED') data.closedAt = new Date();
        else if (toStatus === 'REOPENED') { data.resolvedAt = null; data.closedAt = null; }

        const updated = await prisma.$transaction(async (tx) => {
            // Optimistic guard: only transition if status is still `from`.
            const res = await tx.ticket.updateMany({ where: { id, status: from }, data });
            if (res.count === 0) throw new AppError('Ticket status changed concurrently. Please retry.', 409);
            await TicketActivityService.record(tx, {
                ticketId: id,
                type: isReopen(from, toStatus) ? 'REOPENED' : 'STATUS_CHANGED',
                actorId: user.userId,
                data: { from, to: toStatus, note: note ?? null },
            });
            return tx.ticket.findUnique({ where: { id }, include: detailInclude });
        });
        SupportNotifier.onStatusChange(updated as any, toStatus, user.userId);
        return this.serializeForCaller(user, updated);
    }

    /** Assign a ticket to an agent (same-company + queue-aware) with history. */
    static async assign(user: JwtPayload, id: string, assigneeId: string, reason?: string) {
        const companyId = requireCompany(user);
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: { supportDepartment: { include: { visibleToRoles: { select: { accessRoleId: true } } } } },
        });
        if (!ticket || ticket.deletedAt || ticket.companyId !== companyId) throw new AppError('Ticket not found', 404);

        const assignee = await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { id: true, role: true, accessRoleId: true, companyId: true },
        });
        if (!assignee || assignee.companyId !== companyId) throw new AppError('Assignee must be a user in your company', 400);
        const ctx = { userId: assignee.id, role: assignee.role, companyId: assignee.companyId, accessRoleId: assignee.accessRoleId };
        const isAgent = (await RoleService.hasPermission(ctx, 'MANAGE_TICKETS')) || (await RoleService.hasPermission(ctx, 'VIEW_ALL_TICKETS'));
        if (!isAgent) throw new AppError('Assignee must be a support agent', 400);

        // Queue-aware: a RESTRICTED queue requires the assignee to have access.
        const q = ticket.supportDepartment;
        if (q && q.visibility === 'RESTRICTED') {
            const queueAdmin = await RoleService.hasPermission(ctx, 'MANAGE_SUPPORT_DEPARTMENTS');
            const inRoles = assignee.accessRoleId && q.visibleToRoles.some((r) => r.accessRoleId === assignee.accessRoleId);
            if (!queueAdmin && !inRoles) throw new AppError('Assignee lacks access to this restricted queue', 400);
        }

        if (ticket.assigneeId !== assigneeId) {
            await prisma.$transaction(async (tx) => {
                await tx.ticketAssignment.updateMany({ where: { ticketId: id, unassignedAt: null }, data: { unassignedAt: new Date() } });
                await tx.ticketAssignment.create({
                    data: { ticketId: id, assignedToId: assigneeId, assignedById: user.userId, assignmentType: 'MANUAL', reason: reason ?? null },
                });
                await tx.ticket.update({ where: { id }, data: { assigneeId } });
                await TicketActivityService.record(tx, { ticketId: id, type: 'ASSIGNED', actorId: user.userId, data: { assigneeId, reason: reason ?? null } });
            });
            SupportNotifier.onAssigned(ticket, assigneeId, user.userId);
        }
        return this.serializeForCaller(user, await prisma.ticket.findUnique({ where: { id }, include: detailInclude }));
    }

    static async unassign(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket || ticket.deletedAt || ticket.companyId !== companyId) throw new AppError('Ticket not found', 404);
        if (ticket.assigneeId) {
            await prisma.$transaction(async (tx) => {
                await tx.ticketAssignment.updateMany({ where: { ticketId: id, unassignedAt: null }, data: { unassignedAt: new Date() } });
                await tx.ticket.update({ where: { id }, data: { assigneeId: null } });
                await TicketActivityService.record(tx, { ticketId: id, type: 'UNASSIGNED', actorId: user.userId });
            });
        }
        return this.serializeForCaller(user, await prisma.ticket.findUnique({ where: { id }, include: detailInclude }));
    }

    static async assignToMe(user: JwtPayload, id: string) {
        return this.assign(user, id, user.userId, 'Self-assigned');
    }

    /** Filter comments to the caller's visibility tier, then pick the serializer. */
    private static async serializeForCaller(user: JwtPayload, ticket: any) {
        const canViewAll = await RoleService.hasPermission(user, 'VIEW_ALL_TICKETS');
        const canSeeInternal = canViewAll || (await RoleService.hasPermission(user, 'MANAGE_TICKETS'));
        const canSeeAdmin = await RoleService.hasPermission(user, 'DELETE_TICKETS');
        ticket.comments = (ticket.comments ?? []).filter((c: any) =>
            c.visibility === 'PUBLIC'
            || (c.visibility === 'INTERNAL' && canSeeInternal)
            || (c.visibility === 'ADMIN_ONLY' && canSeeAdmin),
        );
        return canViewAll ? serializeTicketForAgent(ticket) : serializeTicketForEmployee(ticket);
    }
}
