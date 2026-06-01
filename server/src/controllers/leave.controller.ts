import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, leaveStatusTemplate, newLeaveRequestTemplate } from '../utils/email.util';
import { notifyUser, notifyRole } from '../utils/notification';
import { requireString } from '../utils/requestUtils';
import { calculateWorkingDays } from '../utils/date.util';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';
import { CacheService } from '../services/cacheService';
import { RoleService } from '../services/role.service';

// Get available Leave Types (tenant-scoped)
export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        // @ts-ignore
        const types = await prisma.leaveType.findMany({
            where: { ...scope }
        });
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
        const { leaveTypeId, startDate, endDate, reason, duration = 'FULL_DAY' } = req.body; // dates in 'YYYY-MM-DD'

        // Verify leave type belongs to same company
        // @ts-ignore
        const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
        if (!leaveType) return res.status(404).json({ message: 'Leave type not found' });
        if (!assertSameCompany(leaveType.companyId, req as AuthRequest, res)) return;

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Fix: Use correct working day calculation (Skipping Weekends/Holidays)
        let days = await calculateWorkingDays(start, end);

        if (duration === 'FIRST_HALF' || duration === 'SECOND_HALF') {
            if (days === 1) {
                days = 0.5;
            } else if (days > 1) {
                return res.status(400).json({ message: 'Half day leave must be for a single day only.' });
            }
        }

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
                duration,
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

        // 3. Notify whoever can oversee all leave in this company (VIEW_ALL_LEAVES).
        //    Permission-based so custom roles are included, not just HR/ADMIN.
        const recipientUsers = await RoleService.getUsersWithPermission(user?.companyId, 'VIEW_ALL_LEAVES');

        // In-app notifications (batch)
        if (recipientUsers.length > 0) {
            await prisma.notification.createMany({
                data: recipientUsers.map(u => ({
                    userId: u.id,
                    message: msg,
                    link: '/manager/leaves',
                    type: 'TASK'
                }))
            }).catch(e => console.error('Failed to create HR notifications', e));
        }

        // Email HR & Admins
        recipientUsers.forEach(u => {
            if (u.email) {
                sendEmail(
                    u.email,
                    `New Leave Request: ${requesterName}`,
                    newLeaveRequestTemplate(requesterName, leaveTypeName, days, start.toDateString(), end.toDateString(), reason)
                ).catch(e => console.error('Failed to email admin', e));
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

// Get Team Requests (For Manager or Admin) — tenant-scoped
export const getTeamRequests = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, role } = req.user!;
        const tenantWhere = getTenantScope(req);  // { companyId } or {} for SUPER_ADMIN

        // Admin / HR: return all requests within their company
        if (role === 'ADMIN' || role === 'HR' || role === 'SUPER_ADMIN') {
            const requests = await prisma.leaveRequest.findMany({
                where: {
                    user: tenantWhere  // Scope via nested user.companyId
                },
                include: {
                    leaveType: true,
                    user: { include: { profile: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }

        // Manager: only their direct reports within same company
        const subordinates = await prisma.user.findMany({
            where: { managerId: userId, ...tenantWhere },
            select: { id: true }
        });
        const subIds = subordinates.map(u => u.id);

        const requests = await prisma.leaveRequest.findMany({
            where: { userId: { in: subIds } },
            include: {
                leaveType: true,
                user: { include: { profile: true } }
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
        const { status, comment } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be APPROVED or REJECTED.' });
        }

        // Atomic transaction: balance update + status update together
        const updated = await prisma.$transaction(async (tx) => {
            const request = await tx.leaveRequest.findUnique({ where: { id }, include: { user: true } });
            if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });

            // Ensure Admin/Manager acts on a user in their own company
            if (!assertSameCompany(request.user?.companyId, req as AuthRequest, res)) {
                throw Object.assign(new Error('ACCESS_DENIED'), { statusCode: 403 });
            }

            // Guard: reject if already in requested state
            if (request.status === status) {
                throw Object.assign(new Error(`Request is already ${status}`), { statusCode: 400 });
            }

            // Guard: only PENDING requests can be acted on (unless undoing an APPROVED)
            if (request.status !== 'PENDING' && !(status === 'REJECTED' && request.status === 'APPROVED')) {
                throw Object.assign(new Error('Only PENDING requests can be actioned'), { statusCode: 400 });
            }

            // Deduct balance on first approval
            if (status === 'APPROVED') {
                await tx.leaveBalance.update({
                    where: { userId_leaveTypeId: { userId: request.userId, leaveTypeId: request.leaveTypeId } },
                    data: {
                        balance: { decrement: request.days },
                        used: { increment: request.days }
                    }
                });
            }

            // Restore balance when rejecting a previously approved request
            if (status === 'REJECTED' && request.status === 'APPROVED') {
                await tx.leaveBalance.update({
                    where: { userId_leaveTypeId: { userId: request.userId, leaveTypeId: request.leaveTypeId } },
                    data: {
                        balance: { increment: request.days },
                        used: { decrement: request.days }
                    }
                });
            }

            return tx.leaveRequest.update({
                where: { id },
                data: { status, managerComment: comment }
            });
        });

        // Post-transaction: notification + email (failures here don't roll back the status change)
        prisma.notification.create({
            data: {
                userId: updated.userId,
                message: `Your leave request for ${new Date(updated.startDate).toDateString()} was ${status}`,
                link: '/leaves',
                type: 'LEAVE'
            }
        }).catch(e => console.error('[Notification] Failed:', e));

        const userForEmail = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true, profile: { select: { firstName: true } } } });
        if (userForEmail?.email) {
            sendEmail(
                userForEmail.email,
                `Leave Request ${status}`,
                leaveStatusTemplate(
                    userForEmail.profile?.firstName || 'Employee',
                    status,
                    new Date(updated.startDate).toDateString(),
                    new Date(updated.endDate).toDateString()
                )
            ).catch(err => console.error('[Email] Failed to send leave status email:', err));
        }

        res.json(updated);
    } catch (error: any) {
        console.error(error);
        if (error.message === 'ACCESS_DENIED') return;
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message || 'Error updating status' });
    }
};

// Create Leave Type
export const createLeaveType = async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, daysPerYear, carryForward } = req.body;
        const scope = getTenantScope(req);

        if (!scope.companyId && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Company ID required' });
        }

        // @ts-ignore
        const type = await prisma.leaveType.create({
            data: { 
                name, 
                code, 
                daysPerYear: parseInt(daysPerYear), 
                carryForward,
                companyId: scope.companyId
            }
        });

        if (scope.companyId) await CacheService.delByPattern(`tenant:${scope.companyId}:resource:leaveTypes:*`);

        res.json(type);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating leave type' });
    }
};

// Delete Leave Type
export const deleteLeaveType = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        
        // @ts-ignore
        const existing = await prisma.leaveType.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Leave type not found' });
        if (!assertSameCompany(existing.companyId, req, res)) return;

        // @ts-ignore
        await prisma.leaveType.delete({ where: { id } });

        if (existing.companyId) await CacheService.delByPattern(`tenant:${existing.companyId}:resource:leaveTypes:*`);

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
export const processYearEnd = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        if (!scope.companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Company isolation required for this operation' });
        }

        // 1. Get Leave Types that support Carry Forward for THIS company
        const carryForwardTypes = await prisma.leaveType.findMany({
            where: { 
                carryForward: true,
                ...scope
            }
        });

        if (carryForwardTypes.length === 0) {
            return res.json({ message: 'No leave types configured for carry forward.' });
        }

        const results = { updated: 0, errors: 0 };

        // 2. Iterate each type
        for (const type of carryForwardTypes) {
            const balances = await prisma.leaveBalance.findMany({
                where: { leaveTypeId: type.id }
            });

            for (const record of balances) {
                try {
                    const remaining = record.balance; 
                    if (remaining > 0) {
                        const carryOver = Math.min(remaining, type.maxCarryForward || 0);
                        const newBalance = type.daysPerYear + carryOver;

                        await prisma.leaveBalance.update({
                            where: { id: record.id },
                            data: {
                                balance: newBalance,
                                used: 0 
                            }
                        });
                        results.updated++;
                    } else {
                        await prisma.leaveBalance.update({
                            where: { id: record.id },
                            data: {
                                balance: type.daysPerYear,
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

        // 3. Reset Non-Carry-Forward Types
        const standardTypes = await prisma.leaveType.findMany({
            where: { 
                carryForward: false,
                ...scope
            }
        });

        for (const type of standardTypes) {
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
export const encashLeave = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { leaveTypeId, days, reason } = req.body;

        const daysToEncash = parseFloat(days);
        if (isNaN(daysToEncash) || daysToEncash <= 0) {
            return res.status(400).json({ message: 'Invalid days' });
        }

        // Verify leave type belongs to same company
        const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
        if (!leaveType) return res.status(404).json({ message: 'Leave type not found' });
        if (!assertSameCompany(leaveType.companyId, req, res)) return;

        // 1. Check Balance
        const balanceRecord = await prisma.leaveBalance.findUnique({
            where: { userId_leaveTypeId: { userId, leaveTypeId } }
        });

        if (!balanceRecord || balanceRecord.balance < daysToEncash) {
            return res.status(400).json({ message: 'Insufficient leave balance for encashment' });
        }

        // 2. Create Encashment Request & Deduct Balance Atomically
        const encashment = await prisma.$transaction(async (tx) => {
            await tx.leaveBalance.update({
                where: { id: balanceRecord.id },
                data: {
                    balance: { decrement: daysToEncash },
                    used: { increment: daysToEncash }
                }
            });

            return await tx.leaveEncashment.create({
                data: {
                    userId,
                    leaveTypeId,
                    days: daysToEncash,
                    reason,
                    amount: 0, 
                    status: 'PENDING'
                }
            });
        });

        // Notify whoever can approve encashments (MANAGE_PAYROLL) in this company.
        const recipientUsers = await RoleService.getUsersWithPermission(req.user!.companyId, 'MANAGE_PAYROLL');
        
        if (recipientUsers.length > 0) {
            await prisma.notification.createMany({
                data: recipientUsers.map(u => ({
                    userId: u.id,
                    message: `New Encashment Request: ${daysToEncash} days`,
                    link: '/finance/encashments',
                    type: 'TASK'
                }))
            });
        }

        res.json(encashment);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error requesting encashment' });
    }
};

// Update Encashment Status (Admin/HR)
export const updateEncashmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status, comment, amount } = req.body;

        const request = await prisma.leaveEncashment.findUnique({ where: { id }, include: { user: true } });
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (!assertSameCompany(request.user?.companyId, req, res)) return;

        if (status === 'REJECTED' && request.status !== 'REJECTED') {
            // Refund Balance
            await prisma.leaveBalance.update({
                where: { userId_leaveTypeId: { userId: request.userId, leaveTypeId: request.leaveTypeId } },
                data: {
                    balance: { increment: request.days },
                    used: { decrement: request.days }
                }
            });
        }

        // Update
        const updated = await prisma.leaveEncashment.update({
            where: { id },
            data: {
                status,
                managerComment: comment,
                amount: amount ? parseFloat(amount) : (request as any).amount
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
