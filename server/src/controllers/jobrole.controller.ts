import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';

export const getJobRoles = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        // @ts-ignore
        const roles = await prisma.jobRole.findMany({
            where: { ...scope },
            orderBy: { level: 'desc' }
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
};

export const createJobRole = async (req: AuthRequest, res: Response) => {
    try {
        const { title, department, level, description } = req.body;
        const scope = getTenantScope(req);
        
        if (!scope.companyId && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Company ID required' });
        }

        // @ts-ignore
        const role = await prisma.jobRole.create({
            data: { 
                title, 
                department, 
                level: Number(level), 
                description,
                companyId: scope.companyId
            }
        });
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: 'Error creating role' });
    }
};

export const deleteJobRole = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const scope = getTenantScope(req);

        // First find it to check company
        // @ts-ignore
        const existing = await prisma.jobRole.findUnique({ where: { id } });
        
        if (!existing) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (req.user?.role !== 'SUPER_ADMIN' && existing.companyId !== req.user?.companyId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // @ts-ignore
        await prisma.jobRole.delete({ where: { id } });
        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting role' });
    }
};
