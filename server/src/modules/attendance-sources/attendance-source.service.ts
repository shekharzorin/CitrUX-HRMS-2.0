import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { AuditService } from '../../services/audit.service';
import type { JwtPayload } from '../../shared/auth';
import { getDescriptor, secretKeysFor, SOURCE_TYPES } from './source-types.catalog';
import { serializeSource, serializeSources } from './attendance-source.serializer';

const ENTITY = 'ATTENDANCE_SOURCE';

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

interface SourceInput {
    name?: string;
    type?: string;
    configuration?: Record<string, any>;
    isActive?: boolean;
    priority?: number;
}

export class AttendanceSourceService {
    /** Catalog of supported source types — drives the admin "Add source" form. */
    static capabilities() {
        return SOURCE_TYPES;
    }

    static async list(user: JwtPayload) {
        const companyId = requireCompany(user);
        const rows = await prisma.attendanceSource.findMany({
            where: { companyId },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        });
        return serializeSources(rows);
    }

    private static async getOwned(companyId: string, id: string) {
        const src = await prisma.attendanceSource.findUnique({ where: { id } });
        if (!src || src.companyId !== companyId) throw new AppError('Attendance source not found', 404);
        return src;
    }

    static async create(user: JwtPayload, input: SourceInput) {
        const companyId = requireCompany(user);
        if (!input.name?.trim()) throw new AppError('Name is required', 400);
        const descriptor = input.type ? getDescriptor(input.type) : undefined;
        if (!descriptor) throw new AppError('Unknown or unsupported attendance source type', 400);

        const src = await prisma.attendanceSource.create({
            data: {
                companyId,
                name: input.name.trim(),
                type: descriptor.type as any,
                ingestionMode: descriptor.ingestionMode as any, // derived from catalog, never client-chosen
                configuration: this.sanitizeConfig(descriptor.type, input.configuration ?? {}),
                isActive: input.isActive ?? true,
                priority: Number.isFinite(input.priority as number) ? Number(input.priority) : 0,
            },
        });
        await AuditService.log(user.userId, 'CREATE', ENTITY, src.id, { name: src.name, type: src.type });
        return serializeSource(src);
    }

    static async update(user: JwtPayload, id: string, input: SourceInput) {
        const companyId = requireCompany(user);
        const existing = await this.getOwned(companyId, id);

        const data: any = {};
        if (input.name !== undefined) {
            if (!input.name.trim()) throw new AppError('Name cannot be empty', 400);
            data.name = input.name.trim();
        }
        if (input.isActive !== undefined) data.isActive = !!input.isActive;
        if (input.priority !== undefined && Number.isFinite(input.priority)) data.priority = Number(input.priority);
        if (input.configuration !== undefined) {
            // Merge: keep existing secret values when the client sends blank (i.e. "unchanged").
            data.configuration = this.mergeConfig(existing.type, existing.configuration as any, input.configuration);
        }

        const src = await prisma.attendanceSource.update({ where: { id }, data });
        await AuditService.log(user.userId, 'UPDATE', ENTITY, id, { fields: Object.keys(data) });
        return serializeSource(src);
    }

    static async remove(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        await this.getOwned(companyId, id);
        await prisma.attendanceSource.delete({ where: { id } });
        await AuditService.log(user.userId, 'DELETE', ENTITY, id, {});
        return { message: 'Attendance source removed' };
    }

    // Drop unknown keys; keep only fields declared by the type's descriptor.
    private static sanitizeConfig(type: string, input: Record<string, any>) {
        const allowed = new Set((getDescriptor(type)?.configFields ?? []).map((f) => f.key));
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(input)) if (allowed.has(k)) out[k] = v;
        return out;
    }

    // Merge incoming config over existing; a blank/undefined SECRET means "leave as-is".
    private static mergeConfig(type: string, existing: Record<string, any>, incoming: Record<string, any>) {
        const sanitized = this.sanitizeConfig(type, incoming);
        const secrets = new Set(secretKeysFor(type));
        const out: Record<string, any> = { ...(existing ?? {}) };
        for (const [k, v] of Object.entries(sanitized)) {
            if (secrets.has(k) && (v === '' || v === null || v === undefined)) continue; // keep stored secret
            out[k] = v;
        }
        return out;
    }
}
