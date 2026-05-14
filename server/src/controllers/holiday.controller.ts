import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

export const getHolidays = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        // @ts-ignore
        const holidays = await prisma.holiday.findMany({
            where: { ...scope },
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holidays' });
    }
};

export const createHoliday = async (req: AuthRequest, res: Response) => {
    try {
        const { name, date, type } = req.body;
        const scope = getTenantScope(req);

        if (!scope.companyId && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Company ID required' });
        }

        // @ts-ignore
        const holiday = await prisma.holiday.create({
            data: { 
                name, 
                date: new Date(date), 
                type,
                companyId: scope.companyId
            }
        });
        res.json(holiday);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating holiday' });
    }
};

export const deleteHoliday = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        
        // @ts-ignore
        const existing = await prisma.holiday.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Holiday not found' });

        if (!assertSameCompany(existing.companyId, req, res)) return;

        // @ts-ignore
        await prisma.holiday.delete({ where: { id } });
        res.json({ message: 'Holiday deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting holiday' });
    }
};
