import { Request, Response } from 'express';
import { prisma } from '../db';

// Create a new Shift
export const createShift = async (req: Request, res: Response) => {
    try {
        const { name, startTime, endTime, graceTime } = req.body;
        // @ts-ignore
        const shift = await prisma.shift.create({
            data: { name, startTime, endTime, graceTime: graceTime || 15 }
        });
        res.json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error creating shift' });
    }
};

// Get All Shifts
export const getShifts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const shifts = await prisma.shift.findMany();
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shifts' });
    }
};

// Assign Shift to User
export const assignShift = async (req: Request, res: Response) => {
    try {
        const { userId, shiftId } = req.body;

        // @ts-ignore
        const user = await prisma.user.update({
            where: { id: userId },
            data: { shiftId }
        });

        res.json({ message: 'Shift assigned successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error assigning shift' });
    }
};
