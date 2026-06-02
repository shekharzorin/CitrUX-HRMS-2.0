import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { AuditService } from '../../services/audit.service';
import { RoleService } from '../../shared/permissions';
import type { JwtPayload } from '../../shared/auth';

const DEFAULT_QUEUE_NAME = 'General Support';
const ENTITY = 'SUPPORT_DEPARTMENT';

type Visibility = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';

interface QueueInput {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    defaultAssigneeId?: string | null;
    visibility?: Visibility;
    sortOrder?: number;
    isActive?: boolean;
    roleIds?: string[];
}

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

export class SupportDepartmentService {
    /**
     * Idempotently ensure a company has its protected default queue.
     * Safe to call repeatedly (the route is feature-gated, so this only runs
     * when SUPPORT_DESK is enabled for the company).
     */
    static async ensureDefault(companyId: string) {
        const existing = await prisma.supportDepartment.findFirst({
            where: { companyId, isSystem: true, deletedAt: null },
        });
        if (existing) return existing;
        try {
            return await prisma.supportDepartment.create({
                data: {
                    companyId,
                    name: DEFAULT_QUEUE_NAME,
                    description: 'Default queue for general employee requests.',
                    isSystem: true,
                    isActive: true,
                    visibility: 'PUBLIC',
                    sortOrder: 0,
                },
            });
        } catch (err: any) {
            // Lost a race on the unique [companyId, name] — fetch the winner.
            if (err?.code === 'P2002') {
                return prisma.supportDepartment.findFirst({ where: { companyId, name: DEFAULT_QUEUE_NAME } });
            }
            throw err;
        }
    }

    /** Queues the caller may see — visibility-filtered for employees, full for managers. */
    static async listVisible(user: JwtPayload, opts: { includeInactive?: boolean } = {}) {
        const companyId = requireCompany(user);
        await this.ensureDefault(companyId);

        const canManage = await RoleService.hasPermission(user, 'MANAGE_SUPPORT_DEPARTMENTS');
        if (canManage) {
            return prisma.supportDepartment.findMany({
                where: { companyId, deletedAt: null, ...(opts.includeInactive ? {} : { isActive: true }) },
                include: {
                    visibleToRoles: { select: { accessRoleId: true } },
                    _count: { select: { tickets: true } },
                },
                orderBy: { sortOrder: 'asc' },
            });
        }

        const canViewAll = await RoleService.hasPermission(user, 'VIEW_ALL_TICKETS');
        const or: any[] = [{ visibility: 'PUBLIC' as Visibility }];
        if (canViewAll) or.push({ visibility: 'INTERNAL' as Visibility });
        if (user.accessRoleId) {
            or.push({ visibility: 'RESTRICTED' as Visibility, visibleToRoles: { some: { accessRoleId: user.accessRoleId } } });
        }
        return prisma.supportDepartment.findMany({
            where: { companyId, deletedAt: null, isActive: true, OR: or },
            orderBy: { sortOrder: 'asc' },
        });
    }

    static async create(user: JwtPayload, input: QueueInput) {
        const companyId = requireCompany(user);
        await this.assertAssigneeInCompany(companyId, input.defaultAssigneeId);
        await this.assertRolesInCompany(companyId, input.roleIds);

        const queue = await prisma.supportDepartment.create({
            data: {
                companyId,
                name: input.name!,
                description: input.description ?? null,
                icon: input.icon ?? null,
                color: input.color ?? null,
                defaultAssigneeId: input.defaultAssigneeId ?? null,
                visibility: input.visibility ?? 'PUBLIC',
                sortOrder: input.sortOrder ?? 0,
                isActive: input.isActive ?? true,
                visibleToRoles: input.roleIds?.length
                    ? { create: input.roleIds.map((accessRoleId) => ({ accessRoleId })) }
                    : undefined,
            },
            include: { visibleToRoles: { select: { accessRoleId: true } } },
        });
        await AuditService.log(user.userId, 'CREATE', ENTITY, queue.id, { name: queue.name, visibility: queue.visibility });
        return queue;
    }

    static async update(user: JwtPayload, id: string, input: QueueInput) {
        const companyId = requireCompany(user);
        const existing = await this.getOwned(companyId, id);
        await this.assertAssigneeInCompany(companyId, input.defaultAssigneeId);
        await this.assertRolesInCompany(companyId, input.roleIds);

        const queue = await prisma.$transaction(async (tx) => {
            const updated = await tx.supportDepartment.update({
                where: { id },
                data: {
                    name: input.name ?? undefined,
                    description: input.description === undefined ? undefined : input.description,
                    icon: input.icon === undefined ? undefined : input.icon,
                    color: input.color === undefined ? undefined : input.color,
                    defaultAssigneeId: input.defaultAssigneeId === undefined ? undefined : input.defaultAssigneeId,
                    visibility: input.visibility ?? undefined,
                    sortOrder: input.sortOrder ?? undefined,
                    isActive: input.isActive ?? undefined,
                },
            });
            // Replace role mapping only when explicitly provided.
            if (input.roleIds) {
                await tx.supportQueueRole.deleteMany({ where: { supportDepartmentId: id } });
                if (input.roleIds.length) {
                    await tx.supportQueueRole.createMany({
                        data: input.roleIds.map((accessRoleId) => ({ supportDepartmentId: id, accessRoleId })),
                        skipDuplicates: true,
                    });
                }
            }
            return updated;
        });
        await AuditService.log(user.userId, 'UPDATE', ENTITY, id, { name: queue.name });
        return queue;
    }

    static async softDelete(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        const existing = await this.getOwned(companyId, id);
        if (existing.isSystem) {
            throw new AppError('The default system queue cannot be deleted.', 409);
        }
        await prisma.supportDepartment.update({ where: { id }, data: { deletedAt: new Date() } });
        await AuditService.log(user.userId, 'DELETE', ENTITY, id, { name: existing.name });
    }

    static async restore(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        await this.getOwned(companyId, id, { includeDeleted: true });
        const queue = await prisma.supportDepartment.update({ where: { id }, data: { deletedAt: null } });
        await AuditService.log(user.userId, 'RESTORE', ENTITY, id, { name: queue.name });
        return queue;
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private static async getOwned(companyId: string, id: string, opts: { includeDeleted?: boolean } = {}) {
        const queue = await prisma.supportDepartment.findUnique({ where: { id } });
        if (!queue || (!opts.includeDeleted && queue.deletedAt)) throw new AppError('Queue not found', 404);
        if (queue.companyId !== companyId) throw new AppError('Access denied: cross-company access blocked', 403);
        return queue;
    }

    private static async assertAssigneeInCompany(companyId: string, assigneeId?: string | null) {
        if (!assigneeId) return;
        const u = await prisma.user.findUnique({ where: { id: assigneeId }, select: { companyId: true } });
        if (!u || u.companyId !== companyId) throw new AppError('Default assignee must be a user in your company', 400);
    }

    private static async assertRolesInCompany(companyId: string, roleIds?: string[]) {
        if (!roleIds?.length) return;
        const count = await prisma.accessRole.count({ where: { id: { in: roleIds }, companyId } });
        if (count !== new Set(roleIds).size) throw new AppError('All roleIds must belong to your company', 400);
    }
}
