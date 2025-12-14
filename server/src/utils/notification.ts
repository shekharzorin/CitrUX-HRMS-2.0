import { prisma } from '../db';

export const notifyUser = async (userId: string, message: string) => {
    try {
        await prisma.notification.create({
            data: {
                userId,
                message,
                read: false
            }
        });
    } catch (error) {
        console.error('Failed to notify user:', userId, error);
    }
};

export const notifyRole = async (roles: string[], message: string) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: { in: roles }
            },
            select: { id: true }
        });

        if (users.length === 0) return;

        await prisma.notification.createMany({
            data: users.map(u => ({
                userId: u.id,
                message,
                read: false
            }))
        });
    } catch (error) {
        console.error('Failed to notify roles:', roles, error);
    }
};
