import { Request, Response } from 'express';
import { prisma } from '../db';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
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

        res.json({
            users: { total: totalUsers, active: activeUsers },
            attendance: { presentToday }, // Simple count
            finance: { pendingClaims, approvedTotal: totalClaimAmount._sum.amount || 0 },
            recruitment: { openJobs },
            assets: { assigned: assignedAssets }
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
