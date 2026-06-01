import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';
import logger from '../utils/logger';
import { CacheService } from '../services/cacheService';

export const getBranches = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        const branches = await prisma.branch.findMany({ where: scope });
        res.json(branches);
    } catch (error) {
        logger.error('Error fetching branches:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getDepartments = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        const departments = await prisma.department.findMany({ where: scope });
        res.json(departments);
    } catch (error) {
        logger.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const createBranch = async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        const companyId = req.user!.companyId;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        
        const branch = await prisma.branch.create({
            data: { name, companyId: companyId as string }
        });
        res.status(201).json(branch);
    } catch (error) {
        logger.error('Error creating branch:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
    try {
        const { name, branchId } = req.body;
        const companyId = req.user!.companyId;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        
        const department = await prisma.department.create({
            data: { name, branchId, companyId: companyId as string }
        });
        await CacheService.delByPattern(`tenant:${companyId}:resource:departments:*`);
        res.status(201).json(department);
    } catch (error) {
        logger.error('Error creating department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteBranch = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const companyId = req.user!.companyId;

        const branch = await prisma.branch.findFirst({ where: { id, companyId: companyId as string } });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });

        // Unlink profiles
        await prisma.profile.updateMany({
            where: { branchId: id },
            data: { branchId: null }
        });

        // Unlink departments
        await prisma.department.updateMany({
            where: { branchId: id },
            data: { branchId: null }
        });

        await prisma.branch.delete({ where: { id } });
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        logger.error('Error deleting branch:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const companyId = req.user!.companyId;

        const department = await prisma.department.findFirst({ where: { id, companyId: companyId as string } });
        if (!department) return res.status(404).json({ message: 'Department not found' });

        // Unlink profiles
        await prisma.profile.updateMany({
            where: { departmentId: id },
            data: { departmentId: null }
        });

        await prisma.department.delete({ where: { id } });
        await CacheService.delByPattern(`tenant:${companyId}:resource:departments:*`);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        logger.error('Error deleting department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
