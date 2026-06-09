import { Request, Response } from 'express';
import { prisma, withRetry, Prisma } from '../db';
import { NotificationService } from '../services/notification.service';
import { AuditService } from '../services/audit.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';
import { AttendanceAdminService } from '../services/attendance-admin.service';

// ── Admin/HR org-wide attendance console (additive) ──────────────────────────
export const getAdminRecords = async (req: AuthRequest, res: Response) => {
    try {
        res.json(await AttendanceAdminService.listRecords(req, req.query as any));
    } catch (error: any) {
        console.error('AdminRecords Error:', error);
        res.status(500).json({ message: 'Failed to load attendance records.' });
    }
};

export const getAdminFilterOptions = async (req: AuthRequest, res: Response) => {
    try {
        res.json(await AttendanceAdminService.filterOptions(req));
    } catch (error: any) {
        console.error('AdminFilterOptions Error:', error);
        res.status(500).json({ message: 'Failed to load filter options.' });
    }
};

export const exportAdminRecords = async (req: AuthRequest, res: Response) => {
    try {
        const csv = await AttendanceAdminService.exportRecords(req, req.query as any);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    } catch (error: any) {
        // Cap-exceeded (and other validation) errors carry a statusCode → surface them.
        if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('AdminExport Error:', error);
        res.status(500).json({ message: 'Failed to export attendance.' });
    }
};

function isDbConnectionError(err: any): boolean {
    if (err instanceof Prisma.PrismaClientInitializationError) return true;
    const retriable = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
    if (retriable.has(err?.code)) return true;
    const msg: string = err?.message ?? '';
    return msg.includes("Can't reach database") || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
}

export const punchIn = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { location, workDate } = req.body;

        // Always normalize to UTC midnight for consistent DB storage across timezones
        let today: Date;
        if (workDate) {
            // Parse YYYY-MM-DD as UTC date (avoids local-time offset issues)
            const [year, month, day] = (workDate as string).split('-').map(Number);
            today = new Date(Date.UTC(year, month - 1, day));
        } else {
            const now = new Date();
            today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        }

        const existingAttendance = await withRetry(() =>
            prisma.attendance.findFirst({ where: { userId, date: today } })
        );

        if (existingAttendance) {
            return res.status(400).json({ message: 'Already punched in today' });
        }

        // Get User's Shift
        const user = await withRetry(() =>
            prisma.user.findUnique({ where: { id: userId }, include: { shift: true } })
        ) as any;

        let isLate = false;
        let shiftId: string | null = null;

        if (user?.shift) {
            shiftId = user.shift.id;
            const now = new Date();
            const [hours, minutes] = user.shift.startTime.split(':').map(Number);

            const shiftStart = new Date();
            shiftStart.setHours(hours, minutes, 0, 0);

            // Add Grace Time
            const lateTime = new Date(shiftStart.getTime() + user.shift.graceTime * 60000);

            if (now > lateTime) {
                isLate = true;
            }
        }

        const attendance = await withRetry(() =>
            prisma.attendance.create({
                data: { userId, date: today, checkIn: new Date(), location, shiftId, isLate }
            })
        ) as any;

        // NOTIFICATION: Late Arrival
        if (isLate) {
            await NotificationService.notify(userId, 'You have been marked as Late today.', 'WARNING', '/attendance');
        }

        res.json(attendance);
    } catch (error: any) {
        console.error('PunchIn Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'Failed to record clock-in. Please try again.' });
    }
};

export const punchOut = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const _now1 = new Date();
        const today = new Date(Date.UTC(_now1.getUTCFullYear(), _now1.getUTCMonth(), _now1.getUTCDate()));
        // Find the last OPEN session (allows night shifts crossing midnight)
        const attendance = await withRetry(() =>
            prisma.attendance.findFirst({
                where: { userId, checkOut: null },
                orderBy: { checkIn: 'desc' },
                include: { breaks: true }
            })
        ) as any;

        if (!attendance) {
            return res.status(400).json({ message: 'No active punch-in record found.' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: 'Already punched out' });
        }

        const checkOutTime = new Date();

        // 1. Check for Active Break
        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (activeBreak) {
            // Auto-end the break or throw error. User requirement: "break time must reset"
            // We will end the break to ensure data integrity and no "accumulation" error.
            const breakDuration = (checkOutTime.getTime() - new Date(activeBreak.startTime).getTime()) / (1000 * 60); // minutes
            await prisma.break.update({
                where: { id: activeBreak.id },
                data: { endTime: checkOutTime, duration: breakDuration }
            });
            // Update local breaks array for calculation
            activeBreak.endTime = checkOutTime;
            activeBreak.duration = breakDuration; // Optional field in Prisma, might need checking schema but logical here
        }

        // 2. Calculate Total Break Time
        // Reload breaks if needed or use updated array? We updated one item.
        // Let's refetch or calculate manually from the list we have + the one we just updated.
        // But to be safe and simple, let's recalculate total break duration from DB or mapped array.
        // Actually, we can just sum up known durations.

        // Let's re-fetch breaks to be 100% sure of duration sums
        const updatedAttendanceForCalc = await prisma.attendance.findUnique({
            where: { id: attendance.id },
            include: { breaks: true }
        }) as any;

        const totalBreakMinutes = updatedAttendanceForCalc?.breaks.reduce((acc, b) => {
            if (b.duration) return acc + b.duration;
            // If duration not stored, calc it
            if (b.startTime && b.endTime) {
                return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60);
            }
            return acc;
        }, 0) || 0;


        const checkInTime = new Date(attendance.checkIn!);
        const totalDurationHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        const workHours = totalDurationHours - (totalBreakMinutes / 60);

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: checkOutTime,
                hours: workHours > 0 ? workHours : 0 // Enforce non-negative
            }
        });

        res.json(updatedAttendance);
    } catch (error: any) {
        console.error('PunchOut Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'Failed to record clock-out. Please try again.' });
    }
};

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const attendance = await withRetry(() =>
            prisma.attendance.findMany({
                where: { userId },
                include: { breaks: true },
                orderBy: { date: 'desc' }
            })
        ) as any[];

        // Computed consistency fix
        const fixedAttendance = attendance.map(record => {
            if (!record.hours && record.checkIn && record.checkOut) {
                const start = new Date(record.checkIn).getTime();
                const end = new Date(record.checkOut).getTime();
                let durationHrs = (end - start) / (1000 * 60 * 60);

                // Subtract breaks
                const breakMins = record.breaks.reduce((acc, b) => {
                    if (b.duration) return acc + b.duration;
                    if (b.startTime && b.endTime) {
                        return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60);
                    }
                    return acc;
                }, 0);

                durationHrs -= (breakMins / 60);

                return {
                    ...record,
                    hours: durationHrs > 0 ? durationHrs : 0
                };
            }
            return record;
        });

        res.json(fixedAttendance);
    } catch (error: any) {
        console.error('GetAttendance Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'Failed to load attendance history.' });
    }
};

export const getAllAttendance = async (req: AuthRequest, res: Response) => {
    // Admin/HR only — scoped to company
    try {
        const tenantWhere = getTenantScope(req);
        const attendance = await withRetry(() =>
            prisma.attendance.findMany({
                where: { user: tenantWhere },
                // Whitelist — never return the full User (passwordHash/resetToken). The
                // admin "view all" table only needs the employee name + employeeId.
                select: {
                    id: true, userId: true, date: true, checkIn: true, checkOut: true,
                    location: true, hours: true, shiftId: true, status: true, isLate: true,
                    user: { select: { id: true, employeeId: true, profile: { select: { firstName: true, lastName: true } } } },
                    breaks: true,
                },
                orderBy: { date: 'desc' }
            })
        );
        res.json(attendance);
    } catch (error: any) {
        console.error('GetAllAttendance Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'Failed to load attendance records.' });
    }
};

export const startBreak = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const _now2 = new Date();
        const today = new Date(Date.UTC(_now2.getUTCFullYear(), _now2.getUTCMonth(), _now2.getUTCDate()));

        const attendance = await prisma.attendance.findFirst({
            where: { userId, date: today },
            include: { breaks: true }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'Must punch in before taking a break' });
        }

        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (activeBreak) {
            return res.status(400).json({ message: 'You already have an active break' });
        }

        const newBreak = await prisma.break.create({
            data: {
                attendanceId: attendance.id,
                startTime: new Date()
            }
        });

        res.json(newBreak);
    } catch (error) {
        res.status(500).json({ message: 'Error starting break' });
    }
};

export const endBreak = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const _now3 = new Date();
        const today = new Date(Date.UTC(_now3.getUTCFullYear(), _now3.getUTCMonth(), _now3.getUTCDate()));

        const attendance = await prisma.attendance.findFirst({
            where: { userId, date: today },
            include: { breaks: true }
        });

        if (!attendance) return res.status(400).json({ message: 'Attendance record not found' });

        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (!activeBreak) {
            return res.status(400).json({ message: 'No active break found' });
        }

        const endTime = new Date();
        const duration = (endTime.getTime() - new Date(activeBreak.startTime).getTime()) / (1000 * 60); // minutes

        const updatedBreak = await prisma.break.update({
            where: { id: activeBreak.id },
            data: { endTime, duration }
        });

        res.json(updatedBreak);
    } catch (error) {
        res.status(500).json({ message: 'Error ending break' });
    }
};

export const requestAdjustment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { date, clockIn, clockOut, reason } = req.body;

        if (!date || !clockIn || !clockOut || !reason) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const requestDate = new Date(date);

        // Check for existing request for this date
        const existingRequest = await prisma.attendanceRequest.findFirst({
            where: {
                userId,
                date: requestDate,
                status: 'PENDING'
            }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Pending adjustment request already exists for this date' });
        }

        const adjustment = await prisma.attendanceRequest.create({
            data: {
                userId,
                date: requestDate,
                clockIn: new Date(clockIn),
                clockOut: new Date(clockOut),
                reason
            }
        });

        // NOTIFICATION: Notify Manager or Admin
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { managerId: true, profile: { select: { firstName: true, lastName: true } } } });
        const name = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Employee';

        if (user?.managerId) {
            await NotificationService.notify(user.managerId, `Attendance Adjustment Request from ${name}`, 'TASK', '/manager/attendance');
        } else {
            // Need to retrieve admin list, skip specific notification here or implement notifyRole 
            // Since we removed notifyRole, we will log it.
        }

        res.json(adjustment);
    } catch (error) {
        console.error("Adjustment Request Error", error);
        res.status(500).json({ message: 'Error processing adjustment request' });
    }
};


export const overrideAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const adminId = req.user!.userId;
        const { userId, date, checkIn, checkOut, reason } = req.body;

        if (!userId || !date || !checkIn || !reason) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch existing
            const existing = await tx.attendance.findUnique({
                where: {
                    userId_date: {
                        userId,
                        date: targetDate
                    }
                }
            });

            // 2. Prepare new values
            const newCheckIn = new Date(checkIn);
            const newCheckOut = checkOut ? new Date(checkOut) : null;

            let hours = 0;
            if (newCheckIn && newCheckOut) {
                const diff = newCheckOut.getTime() - newCheckIn.getTime();
                hours = diff / (1000 * 60 * 60);
            }

            // 3. Update/Create Attendance
            const updated = await tx.attendance.upsert({
                where: {
                    userId_date: { userId, date: targetDate }
                },
                update: {
                    checkIn: newCheckIn,
                    checkOut: newCheckOut,
                    hours: hours > 0 ? hours : 0,
                    status: 'PRESENT',
                    isLate: false // Admin override assumes correct time
                },
                create: {
                    userId,
                    date: targetDate,
                    checkIn: newCheckIn,
                    checkOut: newCheckOut,
                    hours: hours > 0 ? hours : 0,
                    status: 'PRESENT',
                    isLate: false
                }
            });

            // 4. Create Audit Log
            const changes = {
                before: existing ? {
                    checkIn: existing.checkIn,
                    checkOut: existing.checkOut,
                    hours: existing.hours
                } : 'DOES_NOT_EXIST',
                after: {
                    checkIn: newCheckIn,
                    checkOut: newCheckOut,
                    hours
                },
                reason
            };

            await tx.auditLog.create({
                data: {
                    action: 'ATTENDANCE_OVERRIDE',
                    entityType: 'ATTENDANCE',
                    entityId: updated.id,
                    details: JSON.stringify(changes),
                    performedBy: adminId
                }
            });

            return updated;
        });

        res.json(result);
    } catch (error: any) {
        console.error("Override Error", error);
        res.status(500).json({ message: 'Failed to override attendance' });
    }
};

export const getPendingAdjustments = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.user!.userId;
        const role = req.user!.role;
        const companyId = req.user!.companyId;

        let whereClause: any = { status: 'PENDING' };

        if (role === 'MANAGER') {
            // Managers see only their direct reports' requests
            whereClause.user = { managerId: currentUserId };
        } else {
            // ADMIN / HR see all pending requests in their company
            whereClause.user = { companyId };
        }

        const requests = await prisma.attendanceRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    include: { profile: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending adjustments' });
    }
};

export const respondToAdjustment = async (req: AuthRequest, res: Response) => {
    try {
        const { id, status, comment } = req.body; // status: APPROVED | REJECTED
        const responderId = req.user!.userId;
        const responderRole = req.user!.role;

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.attendanceRequest.findUnique({
                where: { id },
                include: { user: true }
            });

            if (!request) throw new Error('Request not found');
            if (request.status !== 'PENDING') throw new Error('Request already processed');

            // Ownership check: responder must be the employee's manager or an ADMIN/HR
            const isManagerOfEmployee = request.user.managerId === responderId;
            const isAdminOrHR = responderRole === 'ADMIN' || responderRole === 'HR';
            if (!isManagerOfEmployee && !isAdminOrHR) {
                throw new Error('Not authorized to respond to this request');
            }

            // Update request status
            const updatedRequest = await tx.attendanceRequest.update({
                where: { id },
                data: {
                    status,
                    managerComment: comment
                }
            });

            // NOTIFICATION: Notify Employee
            // We need to do this AFTER transaction or usually outside, but inside works if we don't await strictly or if we do simple insert.
            // Using a side-effect here is risky if tx fails, but notification persistence is also DB call. 
            // Better to add notification creation to the transaction if possible, OR return flag to do it after.
            // Since `notifyUser` uses `prisma.notification.create`, we can't easily wrap it in *this* tx unless we pass tx to it.
            // For now, we'll do it after the transaction block to ensure we only notify on success.

            if (status === 'APPROVED') {
                // Calculate hours
                const start = new Date(request.clockIn);
                const end = new Date(request.clockOut);
                const durationMs = end.getTime() - start.getTime();
                const hours = durationMs / (1000 * 60 * 60);

                // Upsert Attendance Record
                // We match by userId + date (composite unique key would be ideal, currently schema has @@unique([userId, date]))
                // Ensure date is normalized to midnight UTC or whatever convention we use
                // logic in punchIn uses: today.setHours(0, 0, 0, 0); local time?
                // The schema stores `date` as DateTime.
                // We should respect the date from the request.
                const d = new Date(request.date);
                const recordDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

                await tx.attendance.upsert({
                    where: {
                        userId_date: {
                            userId: request.userId,
                            date: recordDate
                        }
                    },
                    update: {
                        checkIn: request.clockIn,
                        checkOut: request.clockOut,
                        hours: hours > 0 ? hours : 0,
                        status: 'PRESENT', // Assume present if adjusting
                        isLate: false // Reset or keep? Let's reset as manual override implies correction
                    },
                    create: {
                        userId: request.userId,
                        date: recordDate,
                        checkIn: request.clockIn,
                        checkOut: request.clockOut,
                        hours: hours > 0 ? hours : 0,
                        status: 'PRESENT',
                        isLate: false
                    }
                });
            }

            return updatedRequest;
        });

        // Audit Trail
        await AuditService.log(
            responderId,
            status,
            'ATTENDANCE_REQUEST',
            id,
            { managerComment: comment }
        );

        res.json(result);

        // NOTIFICATION: Post-transaction
        try {
            await NotificationService.notify(result.userId, `Your attendance adjustment request was ${result.status}`, result.status === 'APPROVED' ? 'SUCCESS' : 'ERROR', '/attendance');
        } catch (nErr) {
            console.error('Failed to send stats notification', nErr);
        }
    } catch (error: any) {
        console.error("Respond Adjustment Error", error);
        res.status(400).json({ message: error.message || 'Error processing request' });
    }
};

