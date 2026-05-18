import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';

export const getSettings = async (req: AuthRequest, res: Response) => {
    try {
        const settings = await prisma.systemSetting.findMany();

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        // Merge company-specific branding if user belongs to one
        const companyId = req.user?.companyId;
        if (companyId) {
            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });

            if (company) {
                if (company.name) settingsMap['company_name'] = company.name;
                if (company.logoUrl) settingsMap['company_logo'] = company.logoUrl;
                if (company.faviconUrl) settingsMap['company_favicon'] = company.faviconUrl;
            }
        }

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

export const updateSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({ message: 'Settings data required' });
        }

        // 1. Update Global System Settings (RESTRICTED TO SUPER ADMIN)
        // This prevents regular company admins from changing the global branding/defaults
        if (req.user?.role === 'SUPER_ADMIN') {
            const updates = Object.entries(settings).map(([key, value]) =>
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) },
                })
            );
            await prisma.$transaction(updates);
        }

        // 2. Synchronize with the Company model for the current tenant
        // This ensures branding is isolated to each company
        const companyId = req.user?.companyId;
        if (companyId) {
            const companyData: any = {};
            if (settings['company_name']) companyData.name = settings['company_name'];
            if (settings['company_logo']) companyData.logoUrl = settings['company_logo'];
            if (settings['company_favicon']) companyData.faviconUrl = settings['company_favicon'];

            if (Object.keys(companyData).length > 0) {
                await prisma.company.update({
                    where: { id: companyId },
                    data: companyData
                });
            }
        }
        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'UPDATE',
            'SETTINGS',
            companyId || 'GLOBAL',
            { keysUpdated: Object.keys(settings) }
        );

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
