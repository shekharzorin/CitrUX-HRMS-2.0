import { Response } from 'express';
import { PayrollService } from '../services/payroll.service';
import { notifyUser } from '../utils/notification';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

export const calculatePayroll = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, month, year } = req.body;
        const scope = getTenantScope(req);

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const results: any[] = [];
        for (const userId of userIds) {
            try {
                // Verify user belongs to same company
                const targetUser = await prisma.user.findUnique({ where: { id: userId } });
                if (!targetUser || !assertSameCompany(targetUser.companyId, req, res)) {
                    results.push({ userId, error: 'Unauthorized or User not found' });
                    continue;
                }

                const calculation = await PayrollService.calculateForUser(userId, month, year);
                results.push({ 
                    user: { 
                        id: targetUser.id, 
                        employeeId: targetUser.employeeId, 
                        profile: await prisma.profile.findUnique({ where: { userId: targetUser.id } }) 
                    }, 
                    calculation 
                });
            } catch (error: any) {
                results.push({ userId, error: error.message });
            }
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const generatePayroll = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, month, year } = req.body;

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const generated: any[] = [];
        for (const userId of userIds) {
            try {
                // Verify user belongs to same company
                const targetUser = await prisma.user.findUnique({ where: { id: userId } });
                if (!targetUser || !assertSameCompany(targetUser.companyId, req, res)) continue;

                const payslip = await PayrollService.generatePayslip(userId, month, year);
                generated.push(payslip);

                // NOTIFICATION: Payslip Ready
                await notifyUser(userId, `Your payslip for ${month}/${year} is ready.`, '/payroll', 'INFO');
            } catch (error: any) {
                console.error(`Failed to generate payslip for ${userId}:`, error);
            }
        }

        res.json({ message: 'Payroll generation completed', count: generated.length, generated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and Year required' });
        }

        const payslips = await prisma.payslip.findMany({
            where: {
                month: parseInt(month as string),
                year: parseInt(year as string),
                user: {
                    ...scope
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        employeeId: true,
                        email: true,
                        profile: {
                            select: { firstName: true, lastName: true, department: true, designation: true }
                        }
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        res.json(payslips);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadPayslip = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const payslip = await prisma.payslip.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
        if (!assertSameCompany(payslip.user.companyId, req, res)) return;

        const doc = await PayrollService.generatePdf(id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${id}.pdf`);

        doc.pipe(res);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollStats = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

        const m = parseInt(month as string);
        const y = parseInt(year as string);

        const totalEmployees = await prisma.user.count({ 
            where: { 
                status: 'ACTIVE',
                ...scope
            } 
        });

        const payslips = await prisma.payslip.findMany({
            where: { 
                month: m, 
                year: y,
                user: {
                    ...scope
                }
            }
        });

        const processedCount = payslips.length;
        const totalCost = payslips.reduce((sum, p) => sum + p.net, 0);

        res.json({
            totalEmployees,
            processedCount,
            pendingCount: totalEmployees - processedCount,
            totalCost
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
