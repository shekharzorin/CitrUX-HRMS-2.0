import { prisma } from '../db';
import { SocketService } from './socket.service';

export class NotificationService {
    /**
     * Send an in-app notification to a specific user.
     * @param userId Target user ID
     * @param message Text content of the notification
     * @param type Notification category (e.g., 'SYSTEM', 'APPROVAL', 'ALERT', 'ENGAGEMENT')
     * @param link Optional relative route to redirect the user to when clicking the notification
     */
    static async notify(
        userId: string,
        message: string,
        type: string = 'INFO',
        link?: string
    ) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    message,
                    type: type.toUpperCase(),
                    link,
                    read: false,
                }
            });
            // Real-time Push via WebSocket
            SocketService.sendToUser(userId, 'notification', notification);
            
            return notification;
        } catch (error) {
            console.error('[NotificationService] Failed to create notification:', error);
            throw error;
        }
    }

    /**
     * Mark all unread notifications for a user as read.
     */
    static async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
    }
}
