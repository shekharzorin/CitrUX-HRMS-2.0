import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { AuditService } from '../../services/audit.service';
import type { JwtPayload } from '../../shared/auth';

const ENTITY = 'TICKET_CATEGORY';

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

export class TicketCategoryService {
    /** Verify a queue belongs to the company (and is live). Returns it. */
    private static async getQueue(companyId: string, supportDepartmentId: string) {
        const q = await prisma.supportDepartment.findUnique({ where: { id: supportDepartmentId } });
        if (!q || q.deletedAt || q.companyId !== companyId) throw new AppError('Support queue not found', 404);
        return q;
    }

    /** Active categories under a queue (for the ticket composer + admin). */
    static async list(user: JwtPayload, supportDepartmentId: string) {
        const companyId = requireCompany(user);
        await this.getQueue(companyId, supportDepartmentId);
        return prisma.ticketCategory.findMany({
            where: { companyId, supportDepartmentId, deletedAt: null, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    static async create(user: JwtPayload, supportDepartmentId: string, input: { name: string; description?: string }) {
        const companyId = requireCompany(user);
        await this.getQueue(companyId, supportDepartmentId);
        const category = await prisma.ticketCategory.create({
            data: { companyId, supportDepartmentId, name: input.name, description: input.description ?? null },
        });
        await AuditService.log(user.userId, 'CREATE', ENTITY, category.id, { name: category.name, supportDepartmentId });
        return category;
    }

    static async update(user: JwtPayload, id: string, input: { name?: string; description?: string | null; isActive?: boolean }) {
        const companyId = requireCompany(user);
        const existing = await prisma.ticketCategory.findUnique({ where: { id } });
        if (!existing || existing.deletedAt || existing.companyId !== companyId) throw new AppError('Category not found', 404);
        const category = await prisma.ticketCategory.update({
            where: { id },
            data: {
                name: input.name ?? undefined,
                description: input.description === undefined ? undefined : input.description,
                isActive: input.isActive ?? undefined,
            },
        });
        await AuditService.log(user.userId, 'UPDATE', ENTITY, id, { name: category.name });
        return category;
    }

    static async softDelete(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        const existing = await prisma.ticketCategory.findUnique({ where: { id } });
        if (!existing || existing.deletedAt || existing.companyId !== companyId) throw new AppError('Category not found', 404);
        await prisma.ticketCategory.update({ where: { id }, data: { deletedAt: new Date() } });
        await AuditService.log(user.userId, 'DELETE', ENTITY, id, { name: existing.name });
    }

    /** Validate a category belongs to the given queue + company (for ticket creation). */
    static async assertInQueue(companyId: string, supportDepartmentId: string, categoryId: string) {
        const c = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
        if (!c || c.deletedAt || !c.isActive || c.companyId !== companyId || c.supportDepartmentId !== supportDepartmentId) {
            throw new AppError('Category does not belong to the selected queue', 400);
        }
    }
}
