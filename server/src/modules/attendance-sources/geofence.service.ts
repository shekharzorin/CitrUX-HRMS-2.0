import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { AuditService } from '../../services/audit.service';
import type { JwtPayload } from '../../shared/auth';

const ENTITY = 'ATTENDANCE_GEOFENCE';

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

interface GeofenceInput {
    name?: string;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
    isActive?: boolean;
}

const validCoord = (lat: any, lng: any) =>
    typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export class GeofenceService {
    static async list(user: JwtPayload) {
        const companyId = requireCompany(user);
        return prisma.geofence.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    }

    private static async getOwned(companyId: string, id: string) {
        const g = await prisma.geofence.findUnique({ where: { id } });
        if (!g || g.companyId !== companyId) throw new AppError('Geofence not found', 404);
        return g;
    }

    static async create(user: JwtPayload, input: GeofenceInput) {
        const companyId = requireCompany(user);
        if (!input.name?.trim()) throw new AppError('Name is required', 400);
        if (!validCoord(input.centerLat, input.centerLng)) throw new AppError('Valid latitude/longitude are required', 400);
        const radius = Number(input.radiusMeters);
        if (!Number.isFinite(radius) || radius <= 0) throw new AppError('Radius must be a positive number', 400);

        const g = await prisma.geofence.create({
            data: {
                companyId, name: input.name.trim(), centerLat: input.centerLat!, centerLng: input.centerLng!,
                radiusMeters: Math.round(radius), isActive: input.isActive ?? true,
            },
        });
        await AuditService.log(user.userId, 'CREATE', ENTITY, g.id, { name: g.name });
        return g;
    }

    static async update(user: JwtPayload, id: string, input: GeofenceInput) {
        const companyId = requireCompany(user);
        await this.getOwned(companyId, id);
        const data: any = {};
        if (input.name !== undefined) {
            if (!input.name.trim()) throw new AppError('Name cannot be empty', 400);
            data.name = input.name.trim();
        }
        if (input.centerLat !== undefined || input.centerLng !== undefined) {
            if (!validCoord(input.centerLat, input.centerLng)) throw new AppError('Valid latitude/longitude are required', 400);
            data.centerLat = input.centerLat; data.centerLng = input.centerLng;
        }
        if (input.radiusMeters !== undefined) {
            const radius = Number(input.radiusMeters);
            if (!Number.isFinite(radius) || radius <= 0) throw new AppError('Radius must be a positive number', 400);
            data.radiusMeters = Math.round(radius);
        }
        if (input.isActive !== undefined) data.isActive = !!input.isActive;

        const g = await prisma.geofence.update({ where: { id }, data });
        await AuditService.log(user.userId, 'UPDATE', ENTITY, id, { fields: Object.keys(data) });
        return g;
    }

    static async remove(user: JwtPayload, id: string) {
        const companyId = requireCompany(user);
        await this.getOwned(companyId, id);
        await prisma.geofence.delete({ where: { id } });
        await AuditService.log(user.userId, 'DELETE', ENTITY, id, {});
        return { message: 'Geofence removed' };
    }
}
