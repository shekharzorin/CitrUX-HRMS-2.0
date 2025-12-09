import { Request, Response } from 'express';
import { prisma } from '../db';

// Get available Leave Types
export const getLeaveTypes = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const types = await prisma.leaveType.findMany();
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave types' });
    }
};

// Get My Balances
export const getMyBalances = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const balances = await prisma.leaveBalance.findMany({
            where: { userId },
            include: { leaveType: true }
        });
        res.json(balances);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching balances' });
    }
};

// Apply for Leave
export const applyLeave = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        const { leaveTypeId, startDate, endDate, reason } = req.body; // dates in 'YYYY-MM-DD'

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

        // Check Balance
        // @ts-ignore
        const balance = await prisma.leaveBalance.findUnique({
            where: { userId_leaveTypeId: { userId, leaveTypeId } }
        });

        if (!balance || balance.balance < days) {
            return res.status(400).json({ message: 'Insufficient leave balance' });
        }

        // Create Request
        // @ts-ignore
        const request = await prisma.leaveRequest.create({
            data: {
                userId,
                leaveTypeId,
                startDate: start,
                endDate: end,
                days,
                reason,
                status: 'PENDING'
            }
        });

        res.json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error applying leave' });
    }
};

// Get My Requests
export const getMyRequests = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const requests = await prisma.leaveRequest.findMany({
            where: { userId },
            include: { leaveType: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests' });
    }
};

// Get Team Requests (For Manager)
export const getTeamRequests = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId; // Current User is the Manager

        // Find users reporting to this manager
        const subordinates = await prisma.user.findMany({
            // @ts-ignore
            where: { managerId: userId },
            select: { id: true }
        });

        const subIds = subordinates.map(u => u.id);

        // @ts-ignore
        const requests = await prisma.leaveRequest.findMany({
            where: { userId: { in: subIds } },
            include: {
                leaveType: true,
                user: {
                    include: { profile: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching team requests' });
    }
};

// Approve/Reject Leave
export const updateLeaveStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body; // APPROVED or REJECTED

        // @ts-ignore
        const request = await prisma.leaveRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (status === 'APPROVED' && request.status !== 'APPROVED') {
            // Deduct Balance
            // @ts-ignore
            await prisma.leaveBalance.update({
                where: { userId_leaveTypeId: { userId: request.userId, leaveTypeId: request.leaveTypeId } },
                data: {
                    balance: { decrement: request.days },
                    used: { increment: request.days }
                }
            });
        }

        // @ts-ignore
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: { status, managerComment: comment }
        });

        // Create Notification
        await prisma.notification.create({
            data: {
                userId: request.userId,
                message: `Your leave request for ${new Date(request.startDate).toDateString()} was ${status}`
            }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating status' });
    }
};
