import { Request, Response } from 'express';
import { prisma } from '../db';

export const getJobRoles = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const roles = await prisma.jobRole.findMany({
            orderBy: { level: 'desc' }
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
};

export const createJobRole = async (req: Request, res: Response) => {
    try {
        const { title, department, level, description } = req.body;
        // @ts-ignore
        const role = await prisma.jobRole.create({
            data: { title, department, level: Number(level), description }
        });
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: 'Error creating role' });
    }
};

export const deleteJobRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        await prisma.jobRole.delete({ where: { id } });
        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting role' });
    }
};
