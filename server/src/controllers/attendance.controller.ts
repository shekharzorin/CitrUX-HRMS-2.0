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

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: today,
                checkIn: new Date(),
                location
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
            include: { user: { include: { profile: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
