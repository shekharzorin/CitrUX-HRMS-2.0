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

        // 2. Headcount by Department (using Profile)
        // Note: GroupBy is not fully supported on relations in all Prisma versions in this direct way?
        // We might need raw query or just fetch and reduce if db is small, but let's try counts.
        // Actually Profile is 1:1.
        // Let's do a simple count for now.

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

        // 4. Pending Claims
        const pendingClaims = await prisma.expenseClaim.count({
            where: { status: 'PENDING' }
        });
        const totalClaimAmount = await prisma.expenseClaim.aggregate({
            _sum: { amount: true },
            where: { status: 'APPROVED' }
        });

        // 5. Open Jobs
        const openJobs = await prisma.jobPosting.count({
            where: { status: 'OPEN' }
        });

        // 6. Assigned Assets
        const assignedAssets = await prisma.asset.count({
            where: { status: 'ASSIGNED' }
        });

        // 7. Who is Out (Leaves)
        // @ts-ignore
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

        const whoIsOut = approvedLeaves.map((l: any) => ({
            name: l.user.profile ? `${l.user.profile.firstName} ${l.user.profile.lastName}` : l.user.email,
            role: l.user.profile?.designation || 'Employee',
            status: l.leaveType.name,
            color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' // Dynamic color todo
        }));

        // 8. Birthdays (Raw Query because dob is new/raw)
        // We need month and day match.
        // Postgres: EXTRACT(MONTH FROM dob) ...
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
        // @ts-ignore
        const userRole = req.user?.role || 'EMPLOYEE';
        const isAdminOrHR = ['ADMIN', 'HR'].includes(userRole);

        res.json({
            users: isAdminOrHR ? { total: totalUsers, active: activeUsers } : undefined,
            attendance: isAdminOrHR ? { presentToday } : undefined,
            finance: isAdminOrHR ? { pendingClaims, approvedTotal: totalClaimAmount._sum.amount || 0 } : undefined,
            recruitment: { openJobs }, // Visible to all? optional
            assets: isAdminOrHR ? { assigned: assignedAssets } : undefined,
            whoIsOut,
            birthdays: upcomingBirthdays
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
