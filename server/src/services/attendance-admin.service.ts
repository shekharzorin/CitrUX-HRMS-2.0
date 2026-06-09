import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';
import { AppError } from '../middlewares/error.middleware';

// Admin/HR org-wide attendance console: paginated, filtered, whitelist-serialized.
// Tenant-scoped via the user relation. NEVER returns the full User (passwordHash)
// or selfieUrl — selfies stay behind the admin-gated evidence endpoint.

const MAX_PAGE_SIZE = 100;
const EXPORT_CAP = 20000;
const DEFAULT_WINDOW_DAYS = 30;

function utcMidnight(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

interface ConsoleQuery {
    page?: string; pageSize?: string; search?: string;
    from?: string; to?: string;
    status?: string; attendanceStatus?: string; // accept either name
    departmentId?: string; branchId?: string; sourceId?: string;
    sortBy?: string; sortDir?: string;
}

function resolveWindow(q: ConsoleQuery): { from: Date; to: Date } {
    const to = utcMidnight(q.to) ?? utcMidnight(new Date().toISOString())!;
    const from = utcMidnight(q.from) ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
    return { from, to };
}

function buildWhere(req: AuthRequest, q: ConsoleQuery) {
    const tenant = getTenantScope(req); // { companyId } (or {} for super-admin w/o company)
    const userWhere: any = { ...tenant };

    if (q.search?.trim()) {
        const s = q.search.trim();
        userWhere.OR = [
            { profile: { firstName: { contains: s, mode: 'insensitive' } } },
            { profile: { lastName: { contains: s, mode: 'insensitive' } } },
            { employeeId: { contains: s, mode: 'insensitive' } },
        ];
    }
    const profileFilter: any = {};
    if (q.departmentId) profileFilter.departmentId = q.departmentId;
    if (q.branchId) profileFilter.branchId = q.branchId;
    if (Object.keys(profileFilter).length) userWhere.profile = { ...(userWhere.profile ?? {}), ...profileFilter };

    const where: any = { user: userWhere };

    const { from, to } = resolveWindow(q);
    where.date = { gte: from, lte: to };

    const status = q.attendanceStatus ?? q.status;
    if (status) where.status = status;
    if (q.sourceId) where.primarySourceId = q.sourceId;
    return where;
}

// Stable ordering: chosen sort field, then userId ASC as a deterministic tiebreak.
function orderByOf(q: ConsoleQuery): any[] {
    const dir: 'asc' | 'desc' = q.sortDir === 'asc' ? 'asc' : 'desc';
    const by = q.sortBy ?? 'date';
    let primary: any;
    switch (by) {
        case 'hours': primary = { hours: dir }; break;
        case 'status': primary = { status: dir }; break;
        case 'employee': primary = { user: { profile: { firstName: dir } } }; break;
        case 'date':
        default: primary = { date: dir }; break;
    }
    return [primary, { userId: 'asc' }];
}

const rowSelect = {
    id: true, userId: true, date: true, checkIn: true, checkOut: true, hours: true, status: true,
    isLate: true, generatedFromEvents: true, primarySourceId: true,
    user: {
        select: {
            id: true, employeeId: true,
            profile: {
                select: {
                    firstName: true, lastName: true,
                    departmentRef: { select: { name: true } },
                    branch: { select: { name: true } },
                },
            },
        },
    },
} as const;

async function sourceNameMap(ids: (string | null)[]): Promise<Record<string, string>> {
    const unique = [...new Set(ids.filter(Boolean) as string[])];
    if (unique.length === 0) return {};
    const sources = await prisma.attendanceSource.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return Object.fromEntries(sources.map((s) => [s.id, s.name]));
}

function serializeRow(r: any, srcMap: Record<string, string>) {
    const p = r.user?.profile;
    const firstName = p?.firstName ?? '';
    const lastName = p?.lastName ?? '';
    return {
        id: r.id,
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        hours: r.hours,
        status: r.status,
        isLate: r.isLate,
        sourceName: r.primarySourceId ? (srcMap[r.primarySourceId] ?? '—') : null,
        generatedFromEvents: r.generatedFromEvents,
        employee: {
            id: r.user?.id,
            employeeId: r.user?.employeeId ?? null,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            department: p?.departmentRef?.name ?? null,
            branch: p?.branch?.name ?? null,
        },
    };
}

export class AttendanceAdminService {
    static async filterOptions(req: AuthRequest) {
        const tenant = getTenantScope(req);
        const where = tenant.companyId ? { companyId: tenant.companyId } : {};
        const [departments, branches, sources] = await Promise.all([
            prisma.department.findMany({ where, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            prisma.branch.findMany({ where, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            prisma.attendanceSource.findMany({ where, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        ]);
        return { departments, branches, sources };
    }

    static async listRecords(req: AuthRequest, q: ConsoleQuery) {
        const where = buildWhere(req, q);
        const page = Math.max(1, Number(q.page) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(q.pageSize) || 25));

        const [rows, total] = await prisma.$transaction([
            prisma.attendance.findMany({
                where, select: rowSelect,
                orderBy: orderByOf(q),
                skip: (page - 1) * pageSize, take: pageSize,
            }),
            prisma.attendance.count({ where }),
        ]);
        const srcMap = await sourceNameMap(rows.map((r) => r.primarySourceId));
        return { rows: rows.map((r) => serializeRow(r, srcMap)), total, page, pageSize };
    }

    /** CSV export. Hard 400 when the filtered set exceeds the cap (don't truncate silently). */
    static async exportRecords(req: AuthRequest, q: ConsoleQuery): Promise<string> {
        const where = buildWhere(req, q);
        const total = await prisma.attendance.count({ where });
        if (total > EXPORT_CAP) {
            throw new AppError(`Export matches ${total} rows, which exceeds the ${EXPORT_CAP.toLocaleString()}-row limit. Narrow the date range or filters and try again.`, 400);
        }

        const rows = await prisma.attendance.findMany({ where, select: rowSelect, orderBy: orderByOf(q), take: EXPORT_CAP });
        const srcMap = await sourceNameMap(rows.map((r) => r.primarySourceId));

        const gen = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { employeeId: true, profile: { select: { firstName: true, lastName: true } } },
        });
        const genName = gen?.profile ? `${gen.profile.firstName ?? ''} ${gen.profile.lastName ?? ''}`.trim() : req.user!.userId;

        const esc = (v: any) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const iso = (d: any) => (d ? new Date(d).toISOString() : '');
        const { from, to } = resolveWindow(q);
        const status = q.attendanceStatus ?? q.status;
        const appliedFilters = [
            `from=${iso(from).slice(0, 10)}`, `to=${iso(to).slice(0, 10)}`,
            q.search ? `search=${q.search}` : null,
            status ? `status=${status}` : null,
            q.departmentId ? `departmentId=${q.departmentId}` : null,
            q.branchId ? `branchId=${q.branchId}` : null,
            q.sourceId ? `sourceId=${q.sourceId}` : null,
        ].filter(Boolean).join('; ');

        const lines: string[] = [
            ['Generated By', genName].map(esc).join(','),
            ['Generated At', new Date().toISOString()].map(esc).join(','),
            ['Applied Filters', appliedFilters].map(esc).join(','),
            '',
            ['Employee ID', 'Employee Name', 'Department', 'Branch', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Attendance Status', 'Attendance Source'].join(','),
        ];
        for (const r of rows) {
            const s = serializeRow(r, srcMap);
            lines.push([
                s.employee.employeeId, s.employee.name, s.employee.department, s.employee.branch,
                iso(s.date).slice(0, 10), iso(s.checkIn), iso(s.checkOut),
                s.hours ?? '', s.status, s.sourceName ?? '',
            ].map(esc).join(','));
        }
        return lines.join('\n');
    }
}
