import { Request, Response } from 'express';
import { prisma } from '../db';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemSetting.findMany();

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.json({});
    }
};

export const getPublicSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: ['company_name', 'company_logo'] }
            }
        });

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.json({});
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({ message: 'Settings data required' });
        }

        const updates = Object.entries(settings).map(([key, value]) =>
            prisma.systemSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            })
        );

        await prisma.$transaction(updates);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
