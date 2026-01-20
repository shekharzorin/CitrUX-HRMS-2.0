import { Request, Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';

interface AuthRequest extends Request {
    user?: any;
}

// Create Expense Category (Admin)
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, limit } = req.body;
        // @ts-ignore
        const category = await prisma.expenseCategory.create({
            data: { name, limit: Number(limit) }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category' });
    }
};

// Get Categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const categories = await prisma.expenseCategory.findMany();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

// Submit Claim (Employee)
export const submitClaim = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { categoryId, amount, description, date, receiptUrl } = req.body;
        // @ts-ignore
        const claim = await prisma.expenseClaim.create({
            data: {
                userId,
                categoryId,
                amount: Number(amount),
                description,
                date: new Date(date),
                receiptUrl
            }
        });
        res.json(claim);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting claim' });
        console.error(error);
    }
};

// Get My Claims
export const getMyClaims = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const claims = await prisma.expenseClaim.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching claims' });
    }
};

// Get Pending Claims (Admin/Manager)
export const getPendingClaims = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const claims = await prisma.expenseClaim.findMany({
            where: { status: 'PENDING' },
            include: { user: { include: { profile: true } }, category: true }
        });
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending claims' });
    }
};

// Update Claim Status (Approve/Reject)
export const updateClaimStatus = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body;
        // @ts-ignore
        const updated = await prisma.expenseClaim.update({
            where: { id },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};
