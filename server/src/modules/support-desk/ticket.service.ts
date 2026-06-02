import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { RoleService } from '../../shared/permissions';
import type { JwtPayload } from '../../shared/auth';
import { UploadService } from '../../services/upload.service';
import { SupportDepartmentService } from './support-department.service';
import { TicketCategoryService } from './ticket-category.service';
import { TicketActivityService } from './activity.service';

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
    comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' as const } },
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
        return this.serialize(ticket, { full: false });
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

        // Filter comments by visibility tier.
        const canSeeInternal = canViewAll || (await RoleService.hasPermission(user, 'MANAGE_TICKETS'));
        const canSeeAdmin = await RoleService.hasPermission(user, 'DELETE_TICKETS');
        ticket.comments = ticket.comments.filter((c: any) =>
            c.visibility === 'PUBLIC'
            || (c.visibility === 'INTERNAL' && canSeeInternal)
            || (c.visibility === 'ADMIN_ONLY' && canSeeAdmin),
        );

        return this.serialize(ticket, { full: canViewAll });
    }

    /** Minimal employee payload by default; agents get the fuller shape. */
    private static serialize(t: any, { full }: { full: boolean }) {
        const base = {
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            description: t.description,
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            supportDepartment: t.supportDepartment ?? null,
            category: t.category ?? null,
            attachments: t.attachments ?? [],
            comments: t.comments ?? [],
        };
        if (!full) return base;
        return {
            ...base,
            source: t.source,
            aiStatus: t.aiStatus,
            slaStatus: t.slaStatus,
            requester: t.requester ?? null,
            assignee: t.assignee ?? null,
        };
    }
}
