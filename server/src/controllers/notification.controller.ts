import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

// Get My Notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark as Read
export const markRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};

// Create Notification (Internal Helper or Admin Broadcast)
export const createNotification = async (req: Request, res: Response) => {
    try {
        const { userId, message } = req.body;
        // @ts-ignore
        const notification = await prisma.notification.create({
            data: { userId, message }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification' });
    }
};

// Get Unread Count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const count = await prisma.notification.count({
            where: { userId, read: false }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error counting unread' });
    }
};
