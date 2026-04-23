import { Request, Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { getTenantScope } from '../middlewares/tenant.middleware';

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
        const id = requireString(req.params.id);
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

// Mark All as Read
export const markAllRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing notifications' });
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

// Broadcast Notification (Admin Only)
export const broadcastNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        const senderId = req.user.userId;

        // Verify Admin/HR/SUPER_ADMIN Role (Double check mostly redundant if route middleware handles it but safe)
        if (req.user.role !== 'ADMIN' && req.user.role !== 'HR' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 1. Get all active users within the same tenant
        const scope = getTenantScope(req);
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE', ...scope },
            select: { id: true }
        });

        // 2. Prepare notifications (exclude sender if desired, but usually admins want to see it too to confirm)
        const notifications = users.map(u => ({
            userId: u.id,
            message: `📢 ANNOUNCEMENT: ${message}`,
            read: false
        }));

        // 3. Bulk Create
        await prisma.notification.createMany({
            data: notifications
        });

        res.json({ message: `Broadcast sent to ${users.length} users` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending broadcast' });
    }
};
