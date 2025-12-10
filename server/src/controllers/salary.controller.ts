import { Request, Response } from 'express';
import { prisma } from '../db';

// Upsert Salary Structure
export const updateSalary = async (req: Request, res: Response) => {
    try {
        const { userId, basic, hra, da, allowances, deductions } = req.body;
        const ctc = basic + hra + (da || 0) + (allowances || 0);

        // @ts-ignore
        const salary = await prisma.salaryStructure.upsert({
            where: { userId },
            update: { basic, hra, da, allowances, deductions, ctc },
            create: { userId, basic, hra, da, allowances, deductions, ctc }
        });

        res.json(salary);
    } catch (error) {
        res.status(500).json({ message: 'Error updating salary' });
    }
};

// Get Salary Structure
export const getSalary = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        // @ts-ignore
        const salary = await prisma.salaryStructure.findUnique({ where: { userId } });
        res.json(salary);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary' });
    }
};

// Generate Payslip (Simple)
export const generatePayslip = async (req: Request, res: Response) => {
    try {
        const { userId, month, year } = req.body;

        // @ts-ignore
        const salary = await prisma.salaryStructure.findUnique({ where: { userId } });
        if (!salary) return res.status(400).json({ message: 'Salary structure not defined' });

        const gross = salary.ctc;
        const net = gross - (salary.deductions || 0);

        // Check existing
        // @ts-ignore
        const existing = await prisma.payslip.findFirst({
            where: { userId, month, year }
        });

        if (existing) return res.status(400).json({ message: 'Payslip already generated' });

        // @ts-ignore
        const payslip = await prisma.payslip.create({
            data: {
                userId,
                month,
                year,
                gross,
                net,
                details: JSON.stringify(salary)
            }
        });

        res.json(payslip);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating payslip' });
    }
};
