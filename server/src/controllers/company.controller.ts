import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import logger from '../utils/logger';

// GET /api/companies — SUPER_ADMIN: all companies; others: their own company
export const getCompanies = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role === 'SUPER_ADMIN') {
            const companies = await prisma.company.findMany({
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { users: true } } }
            });
            return res.json(companies);
        }

        // Non-super-admin: return their own company only
        const company = await prisma.company.findUnique({
            where: { id: req.user!.companyId! }
        });
        return res.json(company ? [company] : []);
    } catch (error: any) {
        logger.error('getCompanies Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/companies/:id
export const getCompanyById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Non-super-admins can only view their own company
        if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const company = await prisma.company.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } }
        });
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (error: any) {
        logger.error('getCompanyById Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// POST /api/companies — SUPER_ADMIN only
export const createCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { name, subdomain, logoUrl } = req.body;

        if (!name) return res.status(400).json({ message: 'Company name is required' });

        const existing = await prisma.company.findUnique({ where: { name } });
        if (existing) return res.status(400).json({ message: 'Company already exists with this name' });

        const company = await prisma.company.create({
            data: { name, subdomain, logoUrl }
        });

        logger.info(`Company created: ${company.name} [${company.id}]`);
        res.status(201).json(company);
    } catch (error: any) {
        logger.error('createCompany Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// PUT /api/companies/:id — SUPER_ADMIN or same-company ADMIN
export const updateCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, logoUrl, subdomain } = req.body;

        if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const company = await prisma.company.update({
            where: { id },
            data: { name, logoUrl, subdomain }
        });
        res.json(company);
    } catch (error: any) {
        logger.error('updateCompany Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// DELETE /api/companies/:id — SUPER_ADMIN only
export const deleteCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.company.delete({ where: { id } });
        logger.info(`Company deleted: ${id}`);
        res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
        logger.error('deleteCompany Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/companies/:id/stats — per-company stats for Super Admin dashboard
export const getCompanyStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const [userCount, activeUsers] = await Promise.all([
            prisma.user.count({ where: { companyId: id } }),
            prisma.user.count({ where: { companyId: id, status: 'ACTIVE' } }),
        ]);

        res.json({ companyId: id, totalUsers: userCount, activeUsers });
    } catch (error: any) {
        logger.error('getCompanyStats Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
