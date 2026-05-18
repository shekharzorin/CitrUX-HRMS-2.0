import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUpcomingEvents = async (req: AuthRequest, res: Response) => {
    try {
        const { companyId } = req.user!;
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDay = today.getDate();

        // Fetch all active profiles
        const profiles = await prisma.profile.findMany({
            where: {
                user: { companyId, status: 'ACTIVE' }
            },
            include: {
                user: { select: { employeeId: true } }
            }
        });

        const birthdays: any[] = [];
        const anniversaries: any[] = [];

        profiles.forEach(profile => {
            // Birthdays
            if (profile.dob) {
                const dob = new Date(profile.dob);
                const dobMonth = dob.getMonth() + 1;
                const dobDay = dob.getDate();

                if (dobMonth === currentMonth && dobDay >= currentDay || dobMonth === currentMonth + 1) {
                    birthdays.push({
                        userId: profile.userId,
                        name: `${profile.firstName} ${profile.lastName}`,
                        date: profile.dob,
                        avatar: profile.profilePhotoThumbnailUrl,
                        type: 'BIRTHDAY',
                        dayMonth: `${dobMonth}-${dobDay}`
                    });
                }
            }

            // Work Anniversaries
            if (profile.dateOfJoining) {
                const doj = new Date(profile.dateOfJoining);
                const dojMonth = doj.getMonth() + 1;
                const dojDay = doj.getDate();
                const years = today.getFullYear() - doj.getFullYear();

                if (years > 0 && (dojMonth === currentMonth && dojDay >= currentDay || dojMonth === currentMonth + 1)) {
                    anniversaries.push({
                        userId: profile.userId,
                        name: `${profile.firstName} ${profile.lastName}`,
                        date: profile.dateOfJoining,
                        avatar: profile.profilePhotoThumbnailUrl,
                        type: 'ANNIVERSARY',
                        years,
                        dayMonth: `${dojMonth}-${dojDay}`
                    });
                }
            }
        });

        // Sort by upcoming
        const sortByUpcoming = (a: any, b: any) => {
            const [aMonth, aDay] = a.dayMonth.split('-').map(Number);
            const [bMonth, bDay] = b.dayMonth.split('-').map(Number);
            if (aMonth !== bMonth) return aMonth - bMonth;
            return aDay - bDay;
        };

        birthdays.sort(sortByUpcoming);
        anniversaries.sort(sortByUpcoming);

        res.json({
            birthdays: birthdays.slice(0, 5),
            anniversaries: anniversaries.slice(0, 5)
        });
    } catch (error) {
        console.error('[Engagement] getUpcomingEvents error:', error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

export const getRecognitions = async (req: AuthRequest, res: Response) => {
    try {
        const { companyId } = req.user!;
        const recognitions = await prisma.recognition.findMany({
            where: { companyId },
            include: {
                user: { include: { profile: true } },
                giver: { include: { profile: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json(recognitions);
    } catch (error) {
        console.error('[Engagement] getRecognitions error:', error);
        res.status(500).json({ message: 'Error fetching recognitions' });
    }
};

export const createRecognition = async (req: AuthRequest, res: Response) => {
    try {
        const { userId: giverId, companyId } = req.user!;
        const { userId, category, badge, message } = req.body;

        if (!userId || !category || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (userId === giverId) {
            return res.status(400).json({ message: 'You cannot recognize yourself!' });
        }

        const recognition = await prisma.recognition.create({
            data: {
                userId,
                giverId,
                companyId,
                category,
                badge: badge || 'star',
                message
            },
            include: {
                user: { include: { profile: true } },
                giver: { include: { profile: true } }
            }
        });

        // Also create a notification or audit log
        await prisma.notification.create({
            data: {
                userId,
                message: `You received a new recognition!`,
                type: 'SYSTEM'
            }
        });

        res.status(201).json(recognition);
    } catch (error) {
        console.error('[Engagement] createRecognition error:', error);
        res.status(500).json({ message: 'Error creating recognition' });
    }
};

export const getAppraisals = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, role, companyId } = req.user!;
        const isManager = ['MANAGER', 'ADMIN', 'HR'].includes(role);

        // Fetch My Appraisals
        const myAppraisals = await prisma.performanceReview.findMany({
            where: { userId },
            include: {
                reviewer: { include: { profile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch Team Appraisals if manager
        let teamAppraisals: any[] = [];
        if (isManager) {
            teamAppraisals = await prisma.performanceReview.findMany({
                where: { user: { companyId } },
                include: {
                    user: { include: { profile: true } },
                    reviewer: { include: { profile: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        res.json({
            myAppraisals,
            teamAppraisals
        });
    } catch (error) {
        console.error('[Engagement] getAppraisals error:', error);
        res.status(500).json({ message: 'Error fetching appraisals' });
    }
};

export const createAppraisal = async (req: AuthRequest, res: Response) => {
    try {
        const { userId: reviewerId, role } = req.user!;
        const { userId, period, rating, feedback } = req.body;

        if (!['MANAGER', 'ADMIN', 'HR'].includes(role)) {
            return res.status(403).json({ message: 'Only managers can create appraisals' });
        }

        if (!userId || !period || !rating || !feedback) {
            return res.status(400).json({ message: 'Missing fields' });
        }

        const appraisal = await prisma.performanceReview.create({
            data: {
                userId,
                reviewerId,
                period,
                rating: Number(rating),
                feedback
            },
            include: {
                user: { include: { profile: true } },
                reviewer: { include: { profile: true } }
            }
        });

        res.status(201).json(appraisal);
    } catch (error) {
        console.error('[Engagement] createAppraisal error:', error);
        res.status(500).json({ message: 'Error creating appraisal' });
    }
};
