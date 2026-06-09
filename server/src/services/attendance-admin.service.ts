import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';

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
    from?: string; to?: string; status?: string;
    departmentId?: string; branchId?: string; sourceId?: string;
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

    // Date window — default last 30 days to bound query cost.
    const to = utcMidnight(q.to) ?? utcMidnight(new Date().toISOString())!;
    const from = utcMidnight(q.from) ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
    where.date = { gte: from, lte: to };

    if (q.status) where.status = q.status;
    if (q.sourceId) where.primarySourceId = q.sourceId;
    return where;
}

const rowSelect = {
    id: true, date: true, checkIn: true, checkOut: true, hours: true, status: true,
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
            name: p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '',
            employeeId: r.user?.employeeId ?? null,
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
                orderBy: [{ date: 'desc' }, { id: 'asc' }],
                skip: (page - 1) * pageSize, take: pageSize,
            }),
            prisma.attendance.count({ where }),
        ]);
        const srcMap = await sourceNameMap(rows.map((r) => r.primarySourceId));
        return { rows: rows.map((r) => serializeRow(r, srcMap)), total, page, pageSize };
    }

    static async exportRecords(req: AuthRequest, q: ConsoleQuery): Promise<{ csv: string; truncated: boolean }> {
        const where = buildWhere(req, q);
        const rows = await prisma.attendance.findMany({
            where, select: rowSelect, orderBy: [{ date: 'desc' }], take: EXPORT_CAP + 1,
        });
        const truncated = rows.length > EXPORT_CAP;
        const slice = truncated ? rows.slice(0, EXPORT_CAP) : rows;
        const srcMap = await sourceNameMap(slice.map((r) => r.primarySourceId));

        const esc = (v: any) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const t = (d: any) => (d ? new Date(d).toISOString() : '');
        const header = ['Date', 'Employee', 'Employee ID', 'Department', 'Branch', 'Check In', 'Check Out', 'Hours', 'Status', 'Source'];
        const lines = [header.join(',')];
        for (const r of slice) {
            const s = serializeRow(r, srcMap);
            lines.push([
                t(s.date).slice(0, 10), s.employee.name, s.employee.employeeId, s.employee.department, s.employee.branch,
                t(s.checkIn), t(s.checkOut), s.hours ?? '', s.status, s.sourceName ?? '',
            ].map(esc).join(','));
        }
        return { csv: lines.join('\n'), truncated };
    }
}
