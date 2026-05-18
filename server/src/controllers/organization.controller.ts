import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';
import logger from '../utils/logger';

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
        res.status(201).json(department);
    } catch (error) {
        logger.error('Error creating department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
