import { Request, Response } from 'express';
import { prisma, withRetry } from '../db';
import { Prisma } from '@prisma/client';

function isDbConnectionError(err: any): boolean {
    if (err instanceof Prisma.PrismaClientInitializationError) return true;
    const retriable = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
    if (retriable.has(err?.code)) return true;
    const msg: string = err?.message ?? '';
    return msg.includes("Can't reach database") || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
}

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const reqUser = (req as any).user;
        const userRole: string = reqUser?.role || 'EMPLOYEE';
        const userId: string = reqUser?.userId;
        const companyId: string | null = reqUser?.companyId ?? null;

        const isAdminOrHR = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(userRole);
        const isManager = userRole === 'MANAGER';
        const isManagerOrAbove = isAdminOrHR || isManager;

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrowUTC = new Date(todayUTC.getTime() + 86400000);
        const sevenDaysAgo = new Date(todayUTC.getTime() - 6 * 86400000);
        const fourMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
        const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        const companyFilter = companyId ? { companyId } : {};
        const companyUserFilter = companyId ? { user: { companyId } } : {};

        // ── Admin/HR only stats ──────────────────────────────────────────────────
        let totalUsers = 0, activeUsers = 0, presentToday = 0, lateToday = 0, pendingClaimsCount = 0;

        if (isAdminOrHR) {
            totalUsers = await withRetry(() => prisma.user.count({ where: companyFilter }));
            activeUsers = await withRetry(() => prisma.user.count({ where: { ...companyFilter, status: 'ACTIVE' } }));
            presentToday = await withRetry(() => prisma.attendance.count({
                where: { date: { gte: todayUTC, lt: tomorrowUTC }, ...companyUserFilter }
            }));
            lateToday = await withRetry(() => prisma.attendance.count({
                where: { date: { gte: todayUTC, lt: tomorrowUTC }, isLate: true, ...companyUserFilter }
            }));
            pendingClaimsCount = await withRetry(() => prisma.expenseClaim.count({
                where: { status: 'PENDING', ...companyUserFilter }
            }));
        }

        // ── Manager/Admin: pending leave requests with details ───────────────────
        let pendingLeaves: any[] = [];
        let pendingExpenses: any[] = [];
        let teamMembersList: any[] = [];
        let deptStats: any[] = [];

        if (isManagerOrAbove) {
            const pendingLeaveWhere = isManager
                ? { status: 'PENDING' as const, user: { managerId: userId } }
                : { status: 'PENDING' as const, ...companyUserFilter };

            pendingLeaves = await withRetry(() => prisma.leaveRequest.findMany({
                where: pendingLeaveWhere,
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    reason: true,
                    user: { select: { profile: { select: { firstName: true, lastName: true } } } },
                    leaveType: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }));

            if (isAdminOrHR) {
                pendingExpenses = await withRetry(() => prisma.expenseClaim.findMany({
                    where: { status: 'PENDING', ...companyUserFilter },
                    select: {
                        id: true,
                        description: true,
                        amount: true,
                        user: { select: { profile: { select: { firstName: true, lastName: true } } } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }));
            }

            teamMembersList = await withRetry(() => prisma.user.findMany({
                where: {
                    ...(isManager ? { managerId: userId } : companyFilter),
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    role: true,
                    employeeId: true,
                    profile: { select: { firstName: true, lastName: true, designation: true, profilePhoto: true } },
                },
                take: 8,
            }));

            if (isAdminOrHR) {
                deptStats = (await withRetry(() => prisma.profile.groupBy({
                    by: ['department'],
                    _count: { userId: true },
                    where: { department: { not: null }, user: companyFilter },
                } as any))) as any[];
            }
        }

        // ── Personal stats for employees ─────────────────────────────────────────
        let personalAttendanceRows: any[] = [];
        if (!isManagerOrAbove) {
            personalAttendanceRows = await withRetry(() => prisma.attendance.findMany({
                where: { userId, date: { gte: thisMonthStart } },
                select: { hours: true, isLate: true, status: true },
            }));
        }

        // ── Common queries (all roles) ────────────────────────────────────────────
        const openJobsCount = await withRetry(() => prisma.jobPosting.count({ where: { status: 'OPEN' } }));
        
        const weeklyAttendance = await withRetry(() => prisma.attendance.findMany({
            where: {
                date: { gte: sevenDaysAgo, lt: tomorrowUTC },
                ...(isManagerOrAbove ? companyUserFilter : { userId }),
            },
            select: { date: true },
        }));

        const monthlyLeaves = await withRetry(() => prisma.leaveRequest.findMany({
            where: {
                startDate: { gte: fourMonthsAgo },
                status: { in: ['APPROVED', 'PENDING'] },
                ...(isManagerOrAbove ? companyUserFilter : { userId }),
            },
            select: { startDate: true, status: true },
        }));

        const outToday = await withRetry(() => prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: now },
                endDate: { gte: todayUTC },
                ...companyUserFilter,
            },
            include: { user: { include: { profile: true } }, leaveType: true },
            take: 10,
        }));

        const birthdayRows = await withRetry(() => prisma.profile.findMany({
            where: { dob: { not: null }, user: companyFilter },
            select: { firstName: true, lastName: true, dob: true, profilePhoto: true },
        }));

        // ── Build attendance trend (last 7 days) ──────────────────────────────────
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const attendanceTrend = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sevenDaysAgo.getTime() + i * 86400000);
            const dateStr = d.toISOString().split('T')[0];
            const count = (weeklyAttendance as any[]).filter((a: any) =>
                new Date(a.date).toISOString().split('T')[0] === dateStr
            ).length;
            return { day: dayNames[d.getUTCDay()], date: dateStr, present: count };
        });

        // ── Build leave trend (last 4 months) ────────────────────────────────────
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const leaveTrendMap = new Map<string, { approved: number; pending: number }>();
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(now.getMonth() - i);
            leaveTrendMap.set(monthNames[d.getMonth()], { approved: 0, pending: 0 });
        }
        (monthlyLeaves as any[]).forEach((l: any) => {
            const key = monthNames[new Date(l.startDate).getMonth()];
            const entry = leaveTrendMap.get(key);
            if (entry) {
                if (l.status === 'APPROVED') entry.approved++;
                else if (l.status === 'PENDING') entry.pending++;
            }
        });
        const leaveTrend = Array.from(leaveTrendMap.entries()).map(([month, data]) => ({ month, ...data }));

        // ── Build who's out ───────────────────────────────────────────────────────
        const whoIsOut = (outToday as any[]).map((l: any) => ({
            name: l.user.profile
                ? `${l.user.profile.firstName} ${l.user.profile.lastName}`
                : l.user.email,
            role: l.user.profile?.designation || 'Employee',
            status: l.leaveType.name,
        }));

        // ── Build upcoming birthdays (next 7 days) ────────────────────────────────
        const nextWeek = new Date(todayUTC.getTime() + 7 * 86400000);
        const birthdays = (birthdayRows as any[]).filter((p: any) => {
            if (!p.dob) return false;
            const dob = new Date(p.dob);
            const thisYear = new Date(Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
            const nextYear = new Date(Date.UTC(now.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
            return (thisYear >= todayUTC && thisYear <= nextWeek) || (nextYear >= todayUTC && nextYear <= nextWeek);
        }).map((p: any) => ({
            name: `${p.firstName} ${p.lastName}`,
            date: p.dob,
            photo: p.profilePhoto,
        })).slice(0, 5);

        // ── Personal stats ────────────────────────────────────────────────────────
        const personalStats = !isManagerOrAbove ? {
            daysThisMonth: (personalAttendanceRows as any[]).length,
            hoursThisMonth: parseFloat(
                (personalAttendanceRows as any[]).reduce((acc: number, r: any) => acc + (r.hours || 0), 0).toFixed(1)
            ),
            lateDays: (personalAttendanceRows as any[]).filter((r: any) => r.isLate).length,
        } : undefined;

        res.json({
            users: isAdminOrHR ? { total: totalUsers, active: activeUsers } : undefined,
            attendance: isAdminOrHR ? { presentToday, lateToday } : undefined,
            finance: isAdminOrHR ? { pendingClaims: pendingClaimsCount } : undefined,
            recruitment: { openJobs: openJobsCount },
            departments: isAdminOrHR
                ? (deptStats as any[]).map((d: any) => ({ name: d.department, count: d._count.userId }))
                : undefined,
            whoIsOut,
            birthdays,
            attendanceTrend,
            leaveTrend,
            pendingActions: isManagerOrAbove ? {
                leaves: (pendingLeaves as any[]).map((l: any) => ({
                    id: l.id,
                    userName: l.user.profile
                        ? `${l.user.profile.firstName} ${l.user.profile.lastName}`
                        : 'Unknown',
                    leaveType: l.leaveType?.name || 'Leave',
                    startDate: l.startDate,
                    endDate: l.endDate,
                    reason: l.reason,
                })),
                expenses: (pendingExpenses as any[]).map((e: any) => ({
                    id: e.id,
                    userName: e.user.profile
                        ? `${e.user.profile.firstName} ${e.user.profile.lastName}`
                        : 'Unknown',
                    description: e.description,
                    amount: e.amount,
                })),
            } : undefined,
            teamMembers: isManagerOrAbove
                ? (teamMembersList as any[]).map((u: any) => ({
                    id: u.id,
                    name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : 'Unknown',
                    role: u.role,
                    designation: u.profile?.designation || '',
                    employeeId: u.employeeId,
                    photo: u.profile?.profilePhoto,
                }))
                : undefined,
            personalStats,
        });
    } catch (error: any) {
        console.error('Stats Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again.' });
        }
        res.status(500).json({ message: 'Error fetching dashboard data.' });
    }
};
