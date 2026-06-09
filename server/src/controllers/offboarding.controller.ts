import { Request, Response } from 'express';
import { prisma } from '../db';
import { userSafeSelectWithEmail } from '../utils/safe-select';
import { notifyRole, notifyUser } from '../utils/notification';
import { requireString } from '../utils/requestUtils';

interface AuthRequest extends Request {
    user?: any;
}

// Resign (Employee)
export const resign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { reason, lastDay } = req.body;

        // @ts-ignore
        const offboarding = await prisma.offboarding.create({
            data: {
                userId,
                reason,
                lastDay: new Date(lastDay)
            }
        });

        // Notify Admin & HR
        await notifyRole(['ADMIN', 'HR'], `New Resignation Request from User ID: ${userId}`);

        res.json(offboarding);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting resignation' });
    }
};

// Get Status (Employee)
export const getOffboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const offboarding = await prisma.offboarding.findUnique({
            where: { userId },
            include: { exitInterview: true }
        });
        res.json(offboarding);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching status' });
    }
};

// Submit Exit Interview (Employee)
export const submitExitInterview = async (req: AuthRequest, res: Response) => {
    try {
        const { offboardingId, feedback, rating } = req.body;
        // @ts-ignore
        const interview = await prisma.exitInterview.create({
            data: { offboardingId, feedback, rating: Number(rating) }
        });
        res.json(interview);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting exit interview' });
    }
};

// List Resignations (Admin)
export const getResignations = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const list = await prisma.offboarding.findMany({
            include: { user: { select: userSafeSelectWithEmail } }
        });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching resignations' });
    }
};

// Approve/Update Status (Admin)
export const updateOffboardingStatus = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body;
        // Check for pending assets if status is 'EXITED' or 'COMPLETED'
        if ((status === 'EXITED' || status === 'COMPLETED')) {
            // Need userId, fetch if not in request (it's not, we have offboarding ID)
            const offboardingRecord = await prisma.offboarding.findUnique({
                where: { id },
                select: { userId: true }
            });

            if (offboardingRecord) {
                const assignedAssets = await prisma.asset.findMany({
                    where: {
                        assignedTo: offboardingRecord.userId,
                        status: 'ASSIGNED'
                    }
                });

                if (assignedAssets.length > 0) {
                    return res.status(400).json({
                        message: 'Cannot complete offboarding. User still has assigned assets.',
                        assets: assignedAssets.map(a => a.name) // Return names for UI to display
                    });
                }
            }
        }

        // @ts-ignore
        const updated = await prisma.offboarding.update({
            where: { id },
            data: { status }
        });

        // Notify User
        await notifyUser(updated.userId, `Your offboarding status has been updated to: ${status}`);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Terminate Employee (Admin)
export const terminateEmployee = async (req: Request, res: Response) => {
    try {
        const { userId, lastDay, reason } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if exists
        const existing = await prisma.offboarding.findUnique({ where: { userId } });
        if (existing) return res.status(400).json({ message: 'Offboarding already exists for this user.' });

        // @ts-ignore
        const offboarding = await prisma.offboarding.create({
            data: {
                userId,
                reason: `[INVOLUNTARY] ${reason}`,
                lastDay: new Date(lastDay),
                status: 'APPROVED' // Auto-approved as it's admin initiated
            }
        });

        // Notify User
        await notifyUser(userId, `URGENT: Offboarding initiated by HR. Last working day: ${lastDay}. Please contact HR.`);

        res.json(offboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error terminating employee' });
    }
};
