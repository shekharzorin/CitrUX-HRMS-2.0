import { Request, Response } from 'express';
import { prisma } from '../db';
import { notifyRole, notifyUser } from '../utils/notification';

interface AuthRequest extends Request {
    user?: any;
}

// Get Onboarding Status (Enhanced)
export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const onboarding = await prisma.onboarding.findUnique({
            where: { userId },
            include: { tasks: true }
        });

        if (!onboarding) {
            // Auto-create if not exists
            // @ts-ignore
            const newOnboarding = await prisma.onboarding.create({
                data: {
                    userId,
                    tasks: {
                        create: [
                            { title: 'Upload Aadhar Card' },
                            { title: 'Upload PAN Card' },
                            { title: 'Submit Bank Details' },
                            { title: 'Sign Offer Letter' },
                            { title: 'Read Employee Handbook' }
                        ]
                    }
                },
                include: { tasks: true }
            });
            return res.json(newOnboarding);
        }

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching onboarding status' });
    }
};

// Update Task Status
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId, status } = req.body;
        // @ts-ignore
        const task = await prisma.onboardingTask.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === 'COMPLETED' ? new Date() : null
            }
        });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task' });
    }
};

export const submitOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const {
            bankDetails, firstName, lastName, fatherName,
            dateOfBirth, currAddress, permAddress,
            aadhaarNumber, panNumber,
            aadhaarUrl, panUrl, passbookUrl, offerLetterUrl,
            educationDocumentsUrl, experienceDocumentsUrl
        } = req.body;

        // @ts-ignore
        const onboarding = await prisma.onboarding.update({
            where: { userId },
            data: {
                bankDetails,
                firstName, lastName, fatherName,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                currAddress, permAddress,
                aadhaarNumber, panNumber,
                aadhaarUrl, panUrl, passbookUrl, offerLetterUrl,
                educationDocumentsUrl, experienceDocumentsUrl,
                status: 'SUBMITTED',
                submittedAt: new Date()
            }
        });

        // Notify Admin & HR
        await notifyRole(['ADMIN', 'HR'], `New Onboarding Submission from ${firstName} ${lastName}`);

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting onboarding' });
    }
};

// Admin: Get Pending Onboardings
export const getPendingOnboardings = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const onboardings = await prisma.onboarding.findMany({
            where: { status: 'SUBMITTED' },
            include: { user: { include: { profile: true } } }
        });
        res.json(onboardings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending onboardings' });
    }
};

// Admin: Approve Onboarding
export const approveOnboarding = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Fetch original onboarding data
        // @ts-ignore
        const onboarding = await prisma.onboarding.findUnique({ where: { id } });
        if (!onboarding) return res.status(404).json({ message: 'Record not found' });

        await prisma.$transaction(async (tx) => {
            // 1. Update Onboarding Status
            // @ts-ignore
            await tx.onboarding.update({
                where: { id },
                data: { status: 'APPROVED' }
            });

            // 2. Activate User
            // @ts-ignore
            await tx.user.update({
                where: { id: onboarding.userId },
                data: { status: 'ACTIVE' }
            });

            // 3. Update/Create Profile with Onboarding Data
            // @ts-ignore
            await tx.profile.upsert({
                where: { userId: onboarding.userId },
                create: {
                    userId: onboarding.userId,
                    firstName: onboarding.firstName || 'Employee',
                    lastName: onboarding.lastName || '',
                    documents: JSON.stringify({
                        aadhaar: onboarding.aadhaarUrl,
                        pan: onboarding.panUrl,
                        education: onboarding.educationDocumentsUrl,
                        experience: onboarding.experienceDocumentsUrl
                    })
                    // Add other profile defaults if needed
                },
                update: {
                    firstName: onboarding.firstName || undefined,
                    lastName: onboarding.lastName || undefined,
                    documents: JSON.stringify({
                        aadhaar: onboarding.aadhaarUrl,
                        pan: onboarding.panUrl,
                        education: onboarding.educationDocumentsUrl,
                        experience: onboarding.experienceDocumentsUrl
                    })
                }
            });
        });

        // Notify User
        await notifyUser(onboarding.userId, 'Congratulations! Your onboarding has been approved. Welcome aboard!');

        res.json({ message: 'Approved and Profile Updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error approving onboarding' });
    }
};

// Admin: Get All Onboardings
export const getAllOnboarding = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const onboardings = await prisma.onboarding.findMany({
            include: {
                user: { include: { profile: true } },
                tasks: true
            }
        });
        res.json(onboardings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching onboardings' });
    }
};
