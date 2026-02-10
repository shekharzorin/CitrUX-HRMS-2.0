import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, leaveStatusTemplate, newLeaveRequestTemplate } from '../utils/email.util';
import { notifyUser, notifyRole } from '../utils/notification';
import { requireString } from '../utils/requestUtils';
import { calculateWorkingDays } from '../utils/date.util';

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

        // Fix: Use correct working day calculation (Skipping Weekends/Holidays)
        const days = await calculateWorkingDays(start, end);

        if (days === 0) {
            return res.status(400).json({ message: 'Selected range contains no working days (all weekends/holidays).' });
        }

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

// Process Year-End Carry Forward (Admin)
export const processYearEnd = async (req: Request, res: Response) => {
    try {
        // 1. Get all Leave Types that support Carry Forward
        // @ts-ignore
        const carryForwardTypes = await prisma.leaveType.findMany({
            where: { carryForward: true }
        });

        if (carryForwardTypes.length === 0) {
            return res.json({ message: 'No leave types configured for carry forward.' });
        }

        const results = { updated: 0, errors: 0 };

        // 2. Iterate each type
        for (const type of carryForwardTypes) {
            // Get all balances for this type
            // @ts-ignore
            const balances = await prisma.leaveBalance.findMany({
                where: { leaveTypeId: type.id }
            });

            for (const record of balances) {
                try {
                    // Logic:
                    // Current Balance = Balance - Used (Already tracked in 'balance' field ideally, but current schema has 'balance' and 'used')
                    // Actually, usually 'balance' is the remaining. Let's verify schema.
                    // Schema: balance Float, used Float.
                    // Assuming 'balance' is the OPENING balance + credits.
                    // Remaining = balance - used.

                    const remaining = record.balance; // Simplified if balance is decremented on approval.
                    // WAIT: updateLeaveStatus decrements balance. So 'balance' IS the remaining.
                    // 'used' is just for reporting.

                    if (remaining > 0) {
                        const carryOver = Math.min(remaining, type.maxCarryForward || 0);

                        // New Year Logic:
                        // New Balance = Annual Quota + Carry Over
                        const newBalance = type.daysPerYear + carryOver;

                        // @ts-ignore
                        await prisma.leaveBalance.update({
                            where: { id: record.id },
                            data: {
                                balance: newBalance,
                                used: 0 // Reset used for new year
                            }
                        });
                        results.updated++;
                    } else {
                        // Reset even if 0
                        // @ts-ignore
                        await prisma.leaveBalance.update({
                            where: { id: record.id },
                            data: {
                                balance: type.daysPerYear, // Reset to quota
                                used: 0
                            }
                        });
                        results.updated++;
                    }
                } catch (err) {
                    console.error(`Failed to process balance ${record.id}`, err);
                    results.errors++;
                }
            }
        }

        // 3. Reset Non-Carry-Forward Types (Reset to Quota)
        // @ts-ignore
        const standardTypes = await prisma.leaveType.findMany({
            where: { carryForward: false }
        });

        for (const type of standardTypes) {
            // @ts-ignore
            await prisma.leaveBalance.updateMany({
                where: { leaveTypeId: type.id },
                data: {
                    balance: type.daysPerYear,
                    used: 0
                }
            });
        }

        res.json({ message: 'Year-end process completed.', results });
    } catch (error) {
        console.error('Error processing year-end:', error);
        res.status(500).json({ message: 'Error processing year-end' });
    }
};

// Request Leave Encashment (Employee)
export const encashLeave = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        const { leaveTypeId, days, reason } = req.body;

        const daysToEncash = parseFloat(days);
        if (isNaN(daysToEncash) || daysToEncash <= 0) {
            return res.status(400).json({ message: 'Invalid days' });
        }

        // 1. Check Balance
        // @ts-ignore
        const balanceRecord = await prisma.leaveBalance.findUnique({
            where: { userId_leaveTypeId: { userId, leaveTypeId } }
        });

        if (!balanceRecord || balanceRecord.balance < daysToEncash) {
            return res.status(400).json({ message: 'Insufficient leave balance for encashment' });
        }

        // 2. Create Encashment Request & Deduct Balance Atomically
        const encashment = await prisma.$transaction(async (tx) => {
            // Deduct
            // @ts-ignore
            await tx.leaveBalance.update({
                where: { id: balanceRecord.id },
                data: {
                    balance: { decrement: daysToEncash },
                    used: { increment: daysToEncash }
                }
            });

            // Create Request
            // @ts-ignore
            return await tx.leaveEncashment.create({
                data: {
                    userId,
                    leaveTypeId,
                    days: daysToEncash,
                    reason,
                    amount: 0, // value calculated by Finance/Admin later
                    status: 'PENDING'
                }
            });
        });

        // Notify HR
        await notifyRole(['HR', 'ADMIN'], `New Encashment Request: ${daysToEncash} days`, '/finance/encashments', 'TASK');

        res.json(encashment);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error requesting encashment' });
    }
};

// Update Encashment Status (Admin/HR)
export const updateEncashmentStatus = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status, comment, amount } = req.body;

        // @ts-ignore
        const request = await prisma.leaveEncashment.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (status === 'REJECTED' && request.status !== 'REJECTED') {
            // Refund Balance
            // @ts-ignore
            await prisma.leaveBalance.update({
                where: { userId_leaveTypeId: { userId: request.userId, leaveTypeId: request.leaveTypeId } },
                data: {
                    balance: { increment: request.days },
                    used: { decrement: request.days }
                }
            });
        }

        // Update
        // @ts-ignore
        const updated = await prisma.leaveEncashment.update({
            where: { id },
            data: {
                status,
                managerComment: comment,
                amount: amount ? parseFloat(amount) : request.amount
            }
        });

        // Notify User
        await notifyUser(request.userId, `Encashment Request ${status}`, '/my-finances', 'SYSTEM');

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating encashment' });
    }
};
