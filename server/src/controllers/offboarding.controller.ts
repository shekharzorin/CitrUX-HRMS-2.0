import { Request, Response } from 'express';
import { prisma } from '../db';
import { notifyRole, notifyUser } from '../utils/notification';

interface AuthRequest extends Request {
    user?: any;
}

// Resign (Employee)
export const resign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { reason, lastDay } = req.body;

        // @ts-ignore
        const offboarding = await prisma.offboarding.create({
            data: {
                userId,
                reason,
                lastDay: new Date(lastDay)
            }
        });

        // Notify Admin & HR
        await notifyRole(['ADMIN', 'HR'], `New Resignation Request from User ID: ${userId}`);

        res.json(offboarding);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting resignation' });
    }
};

// Get Status (Employee)
export const getOffboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const offboarding = await prisma.offboarding.findUnique({
            where: { userId },
            include: { exitInterview: true }
        });
        res.json(offboarding);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching status' });
    }
};

// Submit Exit Interview (Employee)
export const submitExitInterview = async (req: AuthRequest, res: Response) => {
    try {
        const { offboardingId, feedback, rating } = req.body;
        // @ts-ignore
        const interview = await prisma.exitInterview.create({
            data: { offboardingId, feedback, rating: Number(rating) }
        });
        res.json(interview);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting exit interview' });
    }
};

// List Resignations (Admin)
export const getResignations = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const list = await prisma.offboarding.findMany({
            include: { user: { include: { profile: true } } }
        });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching resignations' });
    }
};

// Approve/Update Status (Admin)
export const updateOffboardingStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // @ts-ignore
        const updated = await prisma.offboarding.update({
            where: { id },
            data: { status }
        });

        // Notify User
        await notifyUser(updated.userId, `Your offboarding status has been updated to: ${status}`);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};
