import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, leaveStatusTemplate, newLeaveRequestTemplate } from '../utils/email.util';
import { notifyUser, notifyRole } from '../utils/notification';
import { requireString } from '../utils/requestUtils';

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
        // Check for Overlaps with APPROVED or PENDING requests
        const overlappingParams = {
            userId,
            AND: [
                {
                    OR: [
                        { startDate: { lte: end }, endDate: { gte: start } }
                    ]
                },
                {
                    status: { in: ['APPROVED', 'PENDING'] }
                }
            ]
        };

        // Use count for efficiency
        // @ts-ignore
        const overlapCount = await prisma.leaveRequest.count({
            where: overlappingParams
        });

        if (overlapCount > 0) {
            return res.status(400).json({ message: 'Leave request overlaps with an existing approved or pending leave.' });
        }

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
            },
            include: { leaveType: true } // Include leave type name
        });

        // --- Notification Logic ---

        // 1. Get User Details (Name & Manager)
        // @ts-ignore
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, manager: true }
        });

        const requesterName = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Employee';
        // @ts-ignore
        const leaveTypeName = request.leaveType.name;
        const msg = `New Leave Request from ${requesterName}: ${leaveTypeName} (${days} days)`;

        // 2. Notify Manager
        if (user?.managerId) {
            // In-App
            await notifyUser(user.managerId, msg, '/manager/leaves', 'TASK');

            // Email
            if (user.manager?.email) {
                sendEmail(
                    user.manager.email,
                    `New Leave Request: ${requesterName}`,
                    newLeaveRequestTemplate(requesterName, leaveTypeName, days, start.toDateString(), end.toDateString(), reason)
                ).catch(e => console.error('Failed to email manager', e));
            }
        }

        // 3. Notify HR & Admins
        await notifyRole(['HR', 'ADMIN'], msg, '/manager/leaves', 'TASK');

        // Email HR & Admins (optional, avoiding spam if many admins, but good for small teams)
        // Fetch all HR/Admin emails
        // @ts-ignore
        const admins = await prisma.user.findMany({
            where: { role: { in: ['HR', 'ADMIN'] } },
            select: { email: true }
        });

        const adminEmails = admins.map(a => a.email).filter(e => e);
        if (adminEmails.length > 0) {
            adminEmails.forEach(email => {
                if (email) {
                    sendEmail(
                        email,
                        `New Leave Request: ${requesterName}`,
                        newLeaveRequestTemplate(requesterName, leaveTypeName, days, start.toDateString(), end.toDateString(), reason)
                    ).catch(e => console.error('Failed to email admin', e));
                }
            });
        }

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
// Get Team Requests (For Manager or Admin)
export const getTeamRequests = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const { userId, role } = req.user;

        // If Admin or HR, return ALL requests
        if (role === 'ADMIN' || role === 'HR') {
            const requests = await prisma.leaveRequest.findMany({
                include: {
                    leaveType: true,
                    user: {
                        include: { profile: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }

        // If Manager, return Team requests
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
        const id = requireString(req.params.id);
        const { status, comment } = req.body; // APPROVED or   REJECTED

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
        // @ts-ignore
        await prisma.notification.create({
            data: {
                userId: request.userId,
                message: `Your leave request for ${new Date(request.startDate).toDateString()} was ${status}`,
                link: '/leaves',
                type: 'LEAVE'
            }
        });

        // Send Email Notification
        const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { email: true, profile: { select: { firstName: true } } } });
        if (user?.email) {
            await sendEmail(
                user.email,
                `Leave Request ${status}`,
                leaveStatusTemplate(
                    user.profile?.firstName || 'Employee',
                    status,
                    new Date(request.startDate).toDateString(),
                    new Date(request.endDate).toDateString()
                )
            ).catch(err => console.error('[Email] Failed to send leave status email:', err));
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Create Leave Type
export const createLeaveType = async (req: Request, res: Response) => {
    try {
        const { name, code, daysPerYear, carryForward } = req.body;
        // @ts-ignore
        const type = await prisma.leaveType.create({
            data: { name, code, daysPerYear: parseInt(daysPerYear), carryForward }
        });
        res.json(type);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating leave type' });
    }
};

// Delete Leave Type
export const deleteLeaveType = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        // @ts-ignore
        await prisma.leaveType.delete({ where: { id } });
        res.json({ message: 'Leave type deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting leave type' });
    }
};

// Delete Leave Request (Cancel)
export const deleteLeaveRequest = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        // @ts-ignore
        const userId = req.user.userId;

        // @ts-ignore
        const request = await prisma.leaveRequest.findUnique({ where: { id } });

        if (!request) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (request.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized to delete this request' });
        }

        if (request.status === 'APPROVED') {
            return res.status(400).json({ message: 'Cannot delete approved leave. Ask manager to reject it.' });
        }

        // @ts-ignore
        await prisma.leaveRequest.delete({ where: { id } });

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting leave request' });
    }
};
