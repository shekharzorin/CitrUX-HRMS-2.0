import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';
import { AuditService } from '../../services/audit.service';
import type { JwtPayload } from '../../shared/auth';
import { utcMidnight, combineDateTime, upsertEvent, deleteEventByDedup, parseCsv } from './ingestion.util';
import { projectDay, projectDays } from './attendance-engine';
import { findContainingGeofence } from './geofence.util';

const MAX_CSV_ROWS = 5000;

const requireCompany = (user: JwtPayload): string => {
    if (!user.companyId) throw new AppError('Company context required', 403);
    return user.companyId;
};

async function resolveSource(companyId: string, sourceId?: string | null) {
    if (!sourceId) return null;
    const src = await prisma.attendanceSource.findUnique({ where: { id: sourceId } });
    if (!src || src.companyId !== companyId) throw new AppError('Attendance source not found', 404);
    return src;
}

interface ManualInput {
    userId: string;
    sourceId?: string | null;
    date: string;       // YYYY-MM-DD
    checkIn: string;    // HH:mm
    checkOut?: string;  // HH:mm
    note?: string;
}

export class AttendanceIngestionService {
    /** Manager/admin records (or corrects) a day for one employee → events → projection. */
    static async recordManual(user: JwtPayload, input: ManualInput) {
        const companyId = requireCompany(user);
        const target = await prisma.user.findFirst({ where: { id: input.userId, companyId } });
        if (!target) throw new AppError('Employee not found in this company', 404);
        const source = await resolveSource(companyId, input.sourceId);

        const businessDate = utcMidnight(input.date);
        const checkInTs = combineDateTime(input.date, input.checkIn);
        const ciKey = `manual:${target.id}:${input.date}:CHECK_IN`;
        const coKey = `manual:${target.id}:${input.date}:CHECK_OUT`;
        const method = source?.type ?? 'MANUAL';

        await upsertEvent({
            companyId, userId: target.id, sourceId: source?.id ?? null, eventType: 'CHECK_IN',
            timestamp: checkInTs, businessDate, verificationMethod: method, dedupKey: ciKey,
            note: input.note, ingestedVia: 'MANUAL', createdById: user.userId,
        });

        if (input.checkOut) {
            const checkOutTs = combineDateTime(input.date, input.checkOut);
            if (checkOutTs.getTime() <= checkInTs.getTime()) throw new AppError('Check-out must be after check-in', 400);
            await upsertEvent({
                companyId, userId: target.id, sourceId: source?.id ?? null, eventType: 'CHECK_OUT',
                timestamp: checkOutTs, businessDate, verificationMethod: method, dedupKey: coKey,
                note: input.note, ingestedVia: 'MANUAL', createdById: user.userId,
            });
        } else {
            await deleteEventByDedup(companyId, coKey);
        }

        const result = await projectDay(companyId, target.id, businessDate, source?.id ?? null);
        await AuditService.log(user.userId, 'CREATE', 'ATTENDANCE_EVENT', target.id, {
            via: 'MANUAL', date: input.date, sourceId: source?.id ?? null,
        });
        return result;
    }

    // ── Mobile GPS (employee self check-in) ───────────────────────────────────
    private static async activeGpsSource(companyId: string) {
        return prisma.attendanceSource.findFirst({
            where: { companyId, type: 'MOBILE_GPS', isActive: true },
            orderBy: { priority: 'desc' },
        });
    }

    /** What the employee app needs to render the GPS check-in surface. */
    static async getCheckinOptions(user: JwtPayload) {
        const companyId = requireCompany(user);
        const source = await this.activeGpsSource(companyId);
        const cfg: any = source?.configuration ?? {};
        return {
            gpsEnabled: !!source,
            sourceName: source?.name ?? null,
            requireGeofence: !!cfg.requireGeofence,
            requireSelfie: !!cfg.requireSelfie,
            accuracyThresholdMeters: Number(cfg.accuracyThresholdMeters) || null,
        };
    }

    /** Employee checks THEMSELVES in/out via GPS → validated event → projection. */
    static async gpsCheckIn(user: JwtPayload, input: {
        eventType: 'CHECK_IN' | 'CHECK_OUT'; lat: number; lng: number; accuracy?: number; selfieUrl?: string;
    }) {
        const companyId = requireCompany(user);
        const source = await this.activeGpsSource(companyId);
        if (!source) throw new AppError('GPS attendance is not enabled for your company', 400);
        const cfg: any = source.configuration ?? {};

        if (cfg.requireSelfie && !input.selfieUrl) throw new AppError('A selfie is required to check in', 400);

        const threshold = Number(cfg.accuracyThresholdMeters) || 0;
        if (threshold > 0 && typeof input.accuracy === 'number' && input.accuracy > threshold) {
            throw new AppError(`Location accuracy too low (${Math.round(input.accuracy)}m > ${threshold}m). Try again outdoors.`, 400);
        }

        let geofenceId: string | null = null;
        let geofenceName: string | null = null;
        if (cfg.requireGeofence) {
            const fences = await prisma.geofence.findMany({ where: { companyId, isActive: true } });
            if (fences.length === 0) throw new AppError('No allowed locations are configured. Contact your admin.', 400);
            const match = findContainingGeofence(input.lat, input.lng, fences as any);
            if (!match) throw new AppError('You are outside an allowed location for attendance', 403);
            geofenceId = match.fence.id;
            geofenceName = match.fence.name;
        }

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // UTC business date
        const businessDate = utcMidnight(dateStr);
        const dedupKey = `gps:${user.userId}:${dateStr}:${input.eventType}`;

        await upsertEvent({
            companyId, userId: user.userId, sourceId: source.id, eventType: input.eventType,
            timestamp: now, businessDate, verificationMethod: 'MOBILE_GPS', dedupKey,
            locationData: { lat: input.lat, lng: input.lng, accuracy: input.accuracy ?? null, geofenceId, selfieUrl: input.selfieUrl ?? null },
            ingestedVia: 'MOBILE_GPS', createdById: user.userId,
        });

        const result = await projectDay(companyId, user.userId, businessDate, source.id);
        await AuditService.log(user.userId, 'CREATE', 'ATTENDANCE_EVENT', user.userId, {
            via: 'MOBILE_GPS', eventType: input.eventType, geofence: geofenceName,
        });
        return { ...result, eventType: input.eventType, geofence: geofenceName };
    }

    // ── CSV ──────────────────────────────────────────────────────────────────
    private static async buildEmployeeMaps(companyId: string) {
        const users = await prisma.user.findMany({
            where: { companyId }, select: { id: true, email: true, employeeId: true },
        });
        const byEmployeeId = new Map<string, string>();
        const byEmail = new Map<string, string>();
        for (const u of users) {
            if (u.employeeId) byEmployeeId.set(u.employeeId.toLowerCase(), u.id);
            if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
        }
        return { byEmployeeId, byEmail };
    }

    private static parseRows(buffer: Buffer, source: any, maps: { byEmployeeId: Map<string, string>; byEmail: Map<string, string> }) {
        const { header, rows } = parseCsv(buffer.toString('utf8'));
        if (header.length === 0) throw new AppError('CSV is empty', 400);
        const empCol = String(source?.configuration?.employeeIdColumn ?? 'employeeId').toLowerCase();
        const idx = {
            emp: header.indexOf(empCol) >= 0 ? header.indexOf(empCol) : header.indexOf('employeeid'),
            date: header.indexOf('date'),
            checkIn: header.indexOf('checkin') >= 0 ? header.indexOf('checkin') : header.indexOf('check_in'),
            checkOut: header.indexOf('checkout') >= 0 ? header.indexOf('checkout') : header.indexOf('check_out'),
        };
        if (idx.emp < 0 || idx.date < 0 || idx.checkIn < 0) {
            throw new AppError(`CSV must include columns: ${empCol}, date, checkIn (checkOut optional)`, 400);
        }
        if (rows.length > MAX_CSV_ROWS) throw new AppError(`Too many rows (max ${MAX_CSV_ROWS})`, 400);

        const parsed = rows.map((cols, i) => {
            const rowNum = i + 2; // 1-based + header
            const empRef = (cols[idx.emp] ?? '').trim();
            const date = (cols[idx.date] ?? '').trim();
            const checkIn = (cols[idx.checkIn] ?? '').trim();
            const checkOut = idx.checkOut >= 0 ? (cols[idx.checkOut] ?? '').trim() : '';
            if (!empRef && !date && !checkIn) return { rowNum, skip: true } as any; // blank line
            const userId = maps.byEmployeeId.get(empRef.toLowerCase()) ?? maps.byEmail.get(empRef.toLowerCase());
            let error: string | null = null;
            if (!empRef) error = 'missing employee';
            else if (!userId) error = `unknown employee "${empRef}"`;
            else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = `bad date "${date}"`;
            else if (!/^\d{1,2}:\d{2}$/.test(checkIn)) error = `bad checkIn "${checkIn}"`;
            else if (checkOut && !/^\d{1,2}:\d{2}$/.test(checkOut)) error = `bad checkOut "${checkOut}"`;
            return { rowNum, empRef, userId, date, checkIn, checkOut, error };
        }).filter((r) => !r.skip);

        return parsed;
    }

    static async previewCsv(user: JwtPayload, sourceId: string, buffer: Buffer) {
        const companyId = requireCompany(user);
        const source = await resolveSource(companyId, sourceId);
        const maps = await this.buildEmployeeMaps(companyId);
        const parsed = this.parseRows(buffer, source, maps);
        const errors = parsed.filter((r) => r.error).map((r) => ({ row: r.rowNum, message: r.error }));
        return {
            totalRows: parsed.length,
            validRows: parsed.length - errors.length,
            errorRows: errors.length,
            errors: errors.slice(0, 50),
            sample: parsed.filter((r) => !r.error).slice(0, 5).map((r) => ({ employee: r.empRef, date: r.date, checkIn: r.checkIn, checkOut: r.checkOut || null })),
        };
    }

    static async importCsv(user: JwtPayload, sourceId: string, buffer: Buffer) {
        const companyId = requireCompany(user);
        const source = await resolveSource(companyId, sourceId);
        const maps = await this.buildEmployeeMaps(companyId);
        const parsed = this.parseRows(buffer, source, maps);
        const valid = parsed.filter((r) => !r.error);
        const method = source?.type ?? 'CSV_IMPORT';

        const pairs: { userId: string; businessDate: Date }[] = [];
        for (const r of valid) {
            const businessDate = utcMidnight(r.date);
            const checkInTs = combineDateTime(r.date, r.checkIn);
            const base = `csv:${sourceId}:${r.empRef.toLowerCase()}:${r.date}`;
            await upsertEvent({
                companyId, userId: r.userId, sourceId, eventType: 'CHECK_IN', timestamp: checkInTs,
                businessDate, verificationMethod: method, dedupKey: `${base}:CHECK_IN`, ingestedVia: 'CSV_IMPORT',
                createdById: user.userId, rawPayload: { employee: r.empRef, date: r.date, checkIn: r.checkIn, checkOut: r.checkOut || null },
            });
            if (r.checkOut) {
                const checkOutTs = combineDateTime(r.date, r.checkOut);
                if (checkOutTs.getTime() > checkInTs.getTime()) {
                    await upsertEvent({
                        companyId, userId: r.userId, sourceId, eventType: 'CHECK_OUT', timestamp: checkOutTs,
                        businessDate, verificationMethod: method, dedupKey: `${base}:CHECK_OUT`, ingestedVia: 'CSV_IMPORT',
                        createdById: user.userId,
                    });
                }
            }
            pairs.push({ userId: r.userId, businessDate });
        }

        const daysProjected = await projectDays(companyId, pairs, sourceId);
        await AuditService.log(user.userId, 'IMPORT', 'ATTENDANCE_EVENT', sourceId, {
            via: 'CSV_IMPORT', imported: valid.length, skipped: parsed.length - valid.length, daysProjected,
        });
        return {
            imported: valid.length,
            skipped: parsed.length - valid.length,
            daysProjected,
            errors: parsed.filter((r) => r.error).slice(0, 50).map((r) => ({ row: r.rowNum, message: r.error })),
        };
    }
}
