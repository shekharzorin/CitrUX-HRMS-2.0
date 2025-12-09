import { Request, Response } from 'express';
import { prisma } from '../db';

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const totalEmployees = await prisma.user.count({ where: { role: 'EMPLOYEE' } });
        const totalInterns = await prisma.user.count({ where: { role: 'INTERN' } });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const presentToday = await prisma.attendance.count({ where: { date: today } });

        const pendingOnboarding = await prisma.onboarding.count({ where: { status: 'PENDING' } });

        // Payslips this month? Not strictly requested but good.

        res.json({
            totalEmployees,
            totalInterns,
            presentToday,
            pendingOnboarding
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
