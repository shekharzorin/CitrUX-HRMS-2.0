import { Request, Response } from 'express';
import { PayrollService } from '../services/payroll.service';
import { notifyUser } from '../utils/notification';
import { prisma } from '../db';


export const calculatePayroll = async (req: Request, res: Response) => {
    try {
        const { userIds, month, year } = req.body;

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const results = [];
        for (const userId of userIds) {
            try {
                const calculation = await PayrollService.calculateForUser(userId, month, year);
                // Fetch User Details for Preview
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, employeeId: true, profile: { select: { firstName: true, lastName: true } } }
                });

                results.push({ user, calculation });
            } catch (error: any) {
                results.push({ userId, error: error.message });
            }
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const generatePayroll = async (req: Request, res: Response) => {
    try {
        const { userIds, month, year } = req.body;

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const generated = [];
        for (const userId of userIds) {
            try {
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

export const listPayslips = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and Year required' });
        }

        const payslips = await prisma.payslip.findMany({
            where: {
                month: parseInt(month as string),
                year: parseInt(year as string)
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

export const downloadPayslip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const doc = await PayrollService.generatePdf(id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${id}.pdf`);

        doc.pipe(res);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollStats = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

        const m = parseInt(month as string);
        const y = parseInt(year as string);

        const totalEmployees = await prisma.user.count({ where: { status: 'ACTIVE' } });

        const payslips = await prisma.payslip.findMany({
            where: { month: m, year: y }
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
