import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

// Create Goal (Self or Manager)
export const createGoal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.body.userId || req.user!.userId;
        const { title, description, deadline } = req.body;

        // Verify target user is in same company
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // @ts-ignore
        const goal = await prisma.goal.create({
            data: {
                userId,
                title,
                description,
                deadline: new Date(deadline)
            }
        });
        res.json(goal);
    } catch (error) {
        res.status(500).json({ message: 'Error creating goal' });
    }
};

// Get My Goals
export const getMyGoals = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        // @ts-ignore
        const goals = await prisma.goal.findMany({ where: { userId } });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching goals' });
    }
};

// Add Review (Manager)
export const addReview = async (req: AuthRequest, res: Response) => {
    try {
        const reviewerId = req.user!.userId;
        const { userId, period, rating, feedback } = req.body;

        // Verify target user is in same company
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // @ts-ignore
        const review = await prisma.performanceReview.create({
            data: {
                userId,
                reviewerId,
                period,
                rating: Number(rating),
                feedback
            }
        });
        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting review' });
    }
};

// Get My Reviews
export const getMyReviews = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        // @ts-ignore
        const reviews = await prisma.performanceReview.findMany({
            where: { userId },
            include: { reviewer: { include: { profile: true } } }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reviews' });
    }
};

// Get Team Reviews (Admin/HR/Manager)
export const getTeamReviews = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const role = req.user!.role;
        const scope = getTenantScope(req);

        let whereClause: any = {};
        if (role === 'MANAGER') {
            whereClause = { reviewerId: userId };
        } else if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
            // Scope to company
            whereClause = { 
                user: {
                    ...scope
                }
            };
        } else {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // @ts-ignore
        const reviews = await prisma.performanceReview.findMany({
            where: whereClause,
            include: {
                user: { include: { profile: true } },
                reviewer: { include: { profile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching team reviews:", error);
        res.status(500).json({ message: 'Error fetching team reviews' });
    }
};

// Update Goal
export const updateGoal = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { title, description, deadline, status } = req.body;
        const userId = req.user!.userId;

        // @ts-ignore
        const goal = await prisma.goal.findUnique({ 
            where: { id },
            include: { user: true }
        });
        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        // Ownership/Company check
        if (goal.userId !== userId && !['ADMIN', 'HR'].includes(req.user!.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!assertSameCompany((goal as any).user.companyId, req, res)) return;

        // @ts-ignore
        const updated = await prisma.goal.update({
            where: { id },
            data: { title, description, deadline: deadline ? new Date(deadline) : undefined, status }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating goal' });
    }
};

// Delete Goal
export const deleteGoal = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const userId = req.user!.userId;

        // @ts-ignore
        const goal = await prisma.goal.findUnique({ 
            where: { id },
            include: { user: true }
        });
        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        // Ownership/Company check
        if (goal.userId !== userId && !['ADMIN', 'HR'].includes(req.user!.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!assertSameCompany((goal as any).user.companyId, req, res)) return;

        // @ts-ignore
        await prisma.goal.delete({ where: { id } });
        res.json({ message: 'Goal deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting goal' });
    }
};
