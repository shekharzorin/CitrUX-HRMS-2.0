import { Request, Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { getTenantScope } from '../middlewares/tenant.middleware';
import { withRetry } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

// Get My Notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const notifications = await withRetry(() => prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })) as any[];
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark as Read
export const markRead = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const userId = req.user.userId;

        const notification = await withRetry(() => prisma.notification.findUnique({
            where: { id }
        })) as any;

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await withRetry(() => prisma.notification.update({
            where: { id },
            data: { read: true }
        }));
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};

// Mark All as Read
export const markAllRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        await withRetry(() => prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        }));
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing notifications' });
    }
};

// Create Notification (Internal Helper or Admin Broadcast)
export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, message } = req.body;
        const sender = req.user;

        const recipient = await withRetry(() => prisma.user.findUnique({
            where: { id: userId }
        })) as any;

        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        if (sender.role !== 'SUPER_ADMIN' && recipient.companyId !== sender.companyId) {
            return res.status(403).json({ message: 'Cannot send notification to users in other companies' });
        }

        const notification = await withRetry(() => prisma.notification.create({
            data: { userId, message }
        }));
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification' });
    }
};

// Get Unread Count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const count = await withRetry(() => prisma.notification.count({
            where: { userId, read: false }
        }));
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

        // Authorization is enforced at the route via requirePermission('MANAGE_USERS').
        const scope = getTenantScope(req);
        const users = await withRetry(() => prisma.user.findMany({
            where: { status: 'ACTIVE', ...scope },
            select: { id: true }
        })) as { id: string }[];

        const notifications = users.map(u => ({
            userId: u.id,
            message: `📢 ANNOUNCEMENT: ${message}`,
            read: false
        }));

        if (notifications.length > 0) {
            await withRetry(() => prisma.notification.createMany({
                data: notifications
            }));
        }

        res.json({ message: `Broadcast sent to ${users.length} users` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending broadcast' });
    }
};
