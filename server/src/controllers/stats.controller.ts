import { Request, Response } from 'express';
import { prisma } from '../db';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // 0. Ensure Date parsing handle
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        // 1. User Stats
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { status: 'ACTIVE' } });

        // 2. Headcount by Department
        const departmentStats = await prisma.profile.groupBy({
            by: ['department'],
            _count: { userId: true },
            where: { department: { not: null } }
        });

        // 3. Attendance Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const presentToday = await prisma.attendance.count({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 4. Pending Claims & Trend
        const pendingClaims = await prisma.expenseClaim.count({
            where: { status: 'PENDING' }
        });
        const totalClaimAmount = await prisma.expenseClaim.aggregate({
            _sum: { amount: true },
            where: { status: 'APPROVED' }
        });

        // Expense Trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of 6 months ago

        const expenseHistory = await prisma.expenseClaim.findMany({
            where: {
                status: 'APPROVED',
                date: { gte: sixMonthsAgo }
            },
            select: { date: true, amount: true }
        });

        // Aggregate by Month in JS
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const expenseTrendMap = new Map<string, number>();

        // Initialize last 6 months zero
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(today.getMonth() - i);
            const key = `${monthNames[d.getMonth()]}`;
            expenseTrendMap.set(key, 0);
        }

        expenseHistory.forEach(ex => {
            const d = new Date(ex.date);
            const key = `${monthNames[d.getMonth()]}`;
            if (expenseTrendMap.has(key)) {
                expenseTrendMap.set(key, (expenseTrendMap.get(key) || 0) + ex.amount);
            }
        });

        const expenseTrend = Array.from(expenseTrendMap.entries()).map(([month, amount]) => ({ month, amount }));

        // 5. Open Jobs
        const openJobs = await prisma.jobPosting.count({
            where: { status: 'OPEN' }
        });

        // 6. Assigned Assets
        const assignedAssets = await prisma.asset.count({
            where: { status: 'ASSIGNED' }
        });

        // 7. Who is Out (Leaves)
        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay }
            },
            include: {
                user: {
                    include: { profile: true }
                },
                leaveType: true
            }
        });

        const whoIsOut = approvedLeaves.map((l: any) => {
            const statusColors: Record<string, string> = {
                'APPROVED': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
                'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                'REJECTED': 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
            };
            return {
                name: l.user.profile ? `${l.user.profile.firstName} ${l.user.profile.lastName}` : l.user.email,
                role: l.user.profile?.designation || 'Employee',
                status: l.leaveType.name,
                color: statusColors[l.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            };
        });

        // 8. Birthdays
        const profiles = await prisma.$queryRaw`
            SELECT "firstName", "lastName", "dob", "profilePhoto" 
            FROM "Profile" 
            WHERE "dob" IS NOT NULL
        ` as any[];

        const upcomingBirthdays = profiles.filter((p: any) => {
            if (!p.dob) return false;
            const dob = new Date(p.dob);
            const thisYearDob = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            const nextYearDob = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());

            return (thisYearDob >= today && thisYearDob <= nextWeek) ||
                (nextYearDob >= today && nextYearDob <= nextWeek);
        }).map((p: any) => ({
            name: `${p.firstName} ${p.lastName}`,
            date: p.dob,
            photo: p.profilePhoto
        })).slice(0, 5);

        // Check Role
        const userRole = (req as any).user?.role || 'EMPLOYEE';
        const isAdminOrHR = ['ADMIN', 'HR'].includes(userRole);

        res.json({
            users: isAdminOrHR ? { total: totalUsers, active: activeUsers } : undefined,
            attendance: isAdminOrHR ? { presentToday } : undefined,
            finance: isAdminOrHR ? {
                pendingClaims,
                approvedTotal: totalClaimAmount._sum.amount || 0,
                trend: expenseTrend
            } : undefined,
            recruitment: { openJobs },
            assets: isAdminOrHR ? { assigned: assignedAssets } : undefined,
            departments: isAdminOrHR ? departmentStats.map(d => ({ name: d.department, count: d._count.userId })) : undefined,
            whoIsOut,
            birthdays: upcomingBirthdays
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
