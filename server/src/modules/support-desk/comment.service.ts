import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { RoleService } from '../../shared/permissions';
import type { JwtPayload } from '../../shared/auth';
import { UploadService } from '../../services/upload.service';
import { TicketActivityService } from './activity.service';
import { SupportNotifier } from './notifications';
import { serializeComment } from './serializers';

type Visibility = 'PUBLIC' | 'INTERNAL' | 'ADMIN_ONLY';
interface UploadedFile { buffer: Buffer; originalname: string; mimetype: string; size: number; }

const requireCompany = (u: JwtPayload): string => {
    if (!u.companyId) throw new AppError('Company context required', 403);
    return u.companyId;
};

/**
 * Parse @mentions from a comment body — unique handles. Converting mentions into
 * MENTION watchers is a future step; for now the count is recorded in the
 * COMMENT_ADDED activity payload so the parse is real (not dead) code.
 */
export function extractMentions(body: string): string[] {
    const matches = body.match(/@([a-zA-Z0-9._-]+)/g) || [];
    return [...new Set(matches.map((m) => m.slice(1)))];
}

const commentInclude = {
    author: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
    attachments: { where: { deletedAt: null } },
};

export class TicketCommentService {
    private static async loadTicket(companyId: string, ticketId: string) {
        const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!t || t.deletedAt || t.companyId !== companyId) throw new AppError('Ticket not found', 404);
        return t;
    }

    private static async assertCanRead(user: JwtPayload, ticket: any) {
        const canViewAll = await RoleService.hasPermission(user, 'VIEW_ALL_TICKETS');
        const isParticipant = ticket.requesterId === user.userId || ticket.assigneeId === user.userId;
        if (!canViewAll && !isParticipant) throw new AppError('Access denied', 403);
        return { canViewAll };
    }

    static async list(user: JwtPayload, ticketId: string) {
        const companyId = requireCompany(user);
        const ticket = await this.loadTicket(companyId, ticketId);
        const { canViewAll } = await this.assertCanRead(user, ticket);
        const canSeeInternal = canViewAll || (await RoleService.hasPermission(user, 'MANAGE_TICKETS'));
        const canSeeAdmin = await RoleService.hasPermission(user, 'DELETE_TICKETS');

        const comments = await prisma.ticketComment.findMany({
            where: { ticketId, deletedAt: null },
            include: commentInclude,
            orderBy: { createdAt: 'asc' },
        });
        return comments
            .filter((c: any) =>
                c.visibility === 'PUBLIC'
                || (c.visibility === 'INTERNAL' && canSeeInternal)
                || (c.visibility === 'ADMIN_ONLY' && canSeeAdmin))
            .map(serializeComment);
    }

    static async create(
        user: JwtPayload,
        ticketId: string,
        input: { body: string; visibility?: Visibility },
        files: UploadedFile[],
    ) {
        const companyId = requireCompany(user);
        const ticket = await this.loadTicket(companyId, ticketId);
        await this.assertCanRead(user, ticket); // participant or agent may comment

        const visibility: Visibility = input.visibility ?? 'PUBLIC';
        if (visibility === 'INTERNAL' && !(await RoleService.hasPermission(user, 'MANAGE_TICKETS'))) {
            throw new AppError('Internal notes require agent permissions', 403);
        }
        if (visibility === 'ADMIN_ONLY' && !(await RoleService.hasPermission(user, 'DELETE_TICKETS'))) {
            throw new AppError('Admin-only notes require admin permissions', 403);
        }

        const uploaded = [] as { fileName: string; url: string; fileType: string; fileSize: number }[];
        for (const f of files) {
            try {
                const url = await UploadService.uploadDocument(f.buffer, f.originalname, `support/${companyId}`);
                uploaded.push({ fileName: f.originalname, url, fileType: f.mimetype, fileSize: f.size });
            } catch {
                throw new AppError('Attachment upload failed. Please try again.', 502);
            }
        }
        const mentions = extractMentions(input.body);

        const comment = await prisma.$transaction(async (tx) => {
            const c = await tx.ticketComment.create({
                data: {
                    ticketId,
                    authorId: user.userId,
                    body: input.body,
                    visibility,
                    attachments: uploaded.length
                        ? { create: uploaded.map((a) => ({ ...a, ticketId, uploadedById: user.userId })) }
                        : undefined,
                },
                include: commentInclude,
            });
            await TicketActivityService.record(tx, {
                ticketId, type: 'COMMENT_ADDED', actorId: user.userId, data: { visibility, mentions: mentions.length },
            });
            return c;
        });
        SupportNotifier.onComment(ticket, visibility, user.userId);
        return serializeComment(comment);
    }
}
