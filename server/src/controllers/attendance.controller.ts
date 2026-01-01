import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

export const punchIn = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { location } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await prisma.attendance.findFirst({
            where: { userId, date: today }
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Already punched in today' });
        }

        // Get User's Shift
        // @ts-ignore
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { shift: true }
        });

        let isLate = false;
        let shiftId = null;

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

        // @ts-ignore
        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: today,
                checkIn: new Date(),
                location,
                shiftId,
                isLate
            }
        });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const punchOut = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findFirst({
            where: { userId, date: today }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No punch in record found for today' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: 'Already punched out' });
        }

        const checkOutTime = new Date();
        const checkInTime = new Date(attendance.checkIn!);
        const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: checkOutTime,
                hours
            }
        });

        res.json(updatedAttendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const attendance = await prisma.attendance.findMany({
            where: { userId },
            include: { breaks: true },
            orderBy: { date: 'desc' }
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getAllAttendance = async (req: Request, res: Response) => {
    // Admin only
    try {
        const attendance = await prisma.attendance.findMany({
            include: { user: { include: { profile: true } }, breaks: true },
            orderBy: { date: 'desc' }
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const startBreak = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
        const userId = req.user.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
            data: {
                endTime,
                duration
            }
        });

        res.json(updatedBreak);
    } catch (error) {
        res.status(500).json({ message: 'Error ending break' });
    }
};
