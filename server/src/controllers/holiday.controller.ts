import { Request, Response } from 'express';
import { prisma } from '../db';

export const getHolidays = async (req: Request, res: Response) => {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holidays' });
    }
};

export const createHoliday = async (req: Request, res: Response) => {
    try {
        const { name, date, type } = req.body;
        const holiday = await prisma.holiday.create({
            data: { name, date: new Date(date), type }
        });
        res.json(holiday);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating holiday' });
    }
};

export const deleteHoliday = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.holiday.delete({ where: { id } });
        res.json({ message: 'Holiday deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting holiday' });
    }
};
