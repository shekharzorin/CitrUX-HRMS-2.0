import { Request, Response } from 'express';
import { prisma } from '../db';

export const getSettings = async (req: Request, res: Response) => {
    try {
        // Use Raw SQL to bypass outdated Prisma Client types
        const settings = await prisma.$queryRaw`SELECT key, value FROM SystemSetting` as { key: string, value: string }[];

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        // Fallback to empty if table doesn't exist yet (though it should)
        res.json({});
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({ message: 'Settings data required' });
        }

        // Use Raw SQL for upsert
        for (const [key, value] of Object.entries(settings)) {
            await prisma.$executeRaw`INSERT INTO SystemSetting (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
