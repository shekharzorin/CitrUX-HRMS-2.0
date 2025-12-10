import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

// Create Goal (Self or Manager)
export const createGoal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.body.userId || req.user.userId;
        const { title, description, deadline } = req.body;

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
        const userId = req.user.userId;
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
        const reviewerId = req.user.userId;
        const { userId, period, rating, feedback } = req.body;

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
        const userId = req.user.userId;
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
