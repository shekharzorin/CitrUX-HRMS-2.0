import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

export const submitOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { documents, bankDetails } = req.body;

        const existing = await prisma.onboarding.findUnique({ where: { userId } });
        if (existing) {
            return res.status(400).json({ message: 'Onboarding data already submitted' });
        }

        const onboarding = await prisma.onboarding.create({
            data: {
                userId,
                documents: JSON.stringify(documents),
                bankDetails: JSON.stringify(bankDetails),
                status: 'PENDING'
            }
        });

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const learning = await prisma.onboarding.findUnique({ where: { userId } });
        res.json(learning);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const approveOnboarding = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // APPROVED or REJECTED

        const updated = await prisma.onboarding.update({
            where: { id },
            data: { status }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getPendingOnboardings = async (req: Request, res: Response) => {
    try {
        const pending = await prisma.onboarding.findMany({
            where: { status: 'PENDING' },
            include: { user: { include: { profile: true } } }
        });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
