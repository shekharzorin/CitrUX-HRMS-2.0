import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Helper to create notification (internal use)
export const createNotification = async (userId: string, message: string) => {
    try {
        await prisma.notification.create({
            data: { userId, message }
        });
    } catch (e) {
        console.error('Failed to create notification', e);
    }
}
