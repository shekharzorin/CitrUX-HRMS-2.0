import { Request, Response } from 'express';
import { prisma } from '../db';
import { notifyRole, notifyUser } from '../utils/notification';
import { sendEmail, welcomeEmailTemplate } from '../utils/email.util';

interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

// Get Onboarding Status (Full details)
export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const onboarding = await prisma.onboarding.findUnique({
            where: { userId },
            include: {
                emergencyContacts: true,
                experiences: true,
                education: true,
                documents: true
            }
        });

        if (!onboarding) {
            // Auto-create DRAFT if not exists
            const newOnboarding = await prisma.onboarding.create({
                data: {
                    userId,
                    status: 'DRAFT'
                },
                include: {
                    emergencyContacts: true,
                    experiences: true,
                    education: true,
                    documents: true
                }
            });
            return res.json(newOnboarding);
        }

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching onboarding status' });
    }
};

// Update Onboarding (Save as Draft or Partial Update)
export const updateOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const data = req.body;

        // Extract nested arrays to handle separately
        const { emergencyContacts, experiences, education, documents, ...flatData } = data;

        // Prepare nested writes
        const updateData: any = { ...flatData };

        if (emergencyContacts) {
            updateData.emergencyContacts = {
                deleteMany: {},
                create: emergencyContacts.map((c: any) => ({
                    name: c.name,
                    relationship: c.relationship,
                    mobile: c.mobile,
                    alternateMobile: c.alternateMobile
                }))
            };
        }

        if (experiences) {
            updateData.experiences = {
                deleteMany: {},
                create: experiences.map((e: any) => ({
                    companyName: e.companyName,
                    designation: e.designation,
                    employmentType: e.employmentType,
                    startDate: e.startDate ? new Date(e.startDate) : null,
                    endDate: e.endDate ? new Date(e.endDate) : null,
                    isCurrent: e.isCurrent,
                    reasonForLeaving: e.reasonForLeaving
                }))
            };
        }

        if (education) {
            updateData.education = {
                deleteMany: {},
                create: education.map((e: any) => ({
                    institutionName: e.institutionName,
                    degreeOrCourse: e.degreeOrCourse,
                    highestQualification: e.highestQualification,
                    yearOfPassing: e.yearOfPassing ? parseInt(e.yearOfPassing) : null
                }))
            };
        }

        // Documents are usually uploaded one by one via /upload endpoint which returns URL, 
        // but here we might sync their status or metadata. 
        // If documents array is passed, we replace? 
        // Better to upsert documents based on type if possible, but deleteMany is safer for full sync.
        if (documents) {
            updateData.documents = {
                deleteMany: {},
                create: documents.map((d: any) => ({
                    type: d.type,
                    url: d.url,
                    status: d.status || 'PENDING'
                }))
            };
        }

        // Handle Date conversions for flat fields
        if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
        if (updateData.dateOfJoining) updateData.dateOfJoining = new Date(updateData.dateOfJoining);

        // Handle JSON stringification for settings if object passed
        if (updateData.profilePhotoSettings && typeof updateData.profilePhotoSettings === 'object') {
            updateData.profilePhotoSettings = JSON.stringify(updateData.profilePhotoSettings);
        }


        const onboarding = await prisma.onboarding.update({
            where: { userId },
            data: updateData,
            include: {
                emergencyContacts: true,
                experiences: true,
                education: true,
                documents: true
            }
        });

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating onboarding' });
    }
};

// Submit Onboarding (Finalize)
export const submitOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // Simple approach: Update status to SUBMITTED.
        const onboarding = await prisma.onboarding.update({
            where: { userId },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date()
            }
        });

        await notifyRole(['ADMIN', 'HR'], `New Onboarding Submission from User ${userId}`);

        res.json(onboarding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting onboarding' });
    }
};

// Admin: Get Pending Onboardings
export const getPendingOnboardings = async (req: Request, res: Response) => {
    try {
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

        const onboarding = await prisma.onboarding.findUnique({
            where: { id },
            include: {
                emergencyContacts: true,
                experiences: true,
                education: true,
                documents: true
            }
        });
        if (!onboarding) return res.status(404).json({ message: 'Record not found' });

        await prisma.$transaction(async (tx) => {
            // 1. Update Onboarding Status
            await tx.onboarding.update({
                where: { id },
                data: { status: 'APPROVED' }
            });

            // 2. Activate User
            await tx.user.update({
                where: { id: onboarding.userId },
                data: {
                    status: 'ACTIVE',
                    // Maybe update employeeId if we generated it
                }
            });

            // 3. Update/Create Profile
            await tx.profile.upsert({
                where: { userId: onboarding.userId },
                create: {
                    userId: onboarding.userId,
                    firstName: onboarding.fullName?.split(' ')[0] || 'Employee',
                    lastName: onboarding.fullName?.split(' ').slice(1).join(' ') || '',
                    phone: onboarding.personalMobile,
                    department: onboarding.department,
                    designation: onboarding.designation,
                    employmentType: onboarding.employmentType || "FULL_TIME",
                    dateOfJoining: onboarding.dateOfJoining,
                    documents: JSON.stringify(onboarding.documents),
                    profilePhoto: onboarding.profilePhoto,
                    profilePhotoSettings: onboarding.profilePhotoSettings
                },
                update: {
                    firstName: onboarding.fullName?.split(' ')[0] || undefined,
                    lastName: onboarding.fullName?.split(' ').slice(1).join(' ') || undefined,
                    phone: onboarding.personalMobile,
                    department: onboarding.department,
                    designation: onboarding.designation,
                    employmentType: onboarding.employmentType || undefined,
                    dateOfJoining: onboarding.dateOfJoining,
                    documents: JSON.stringify(onboarding.documents),
                    profilePhoto: onboarding.profilePhoto,
                    profilePhotoSettings: onboarding.profilePhotoSettings
                }
            });
        });

        // Notify User
        await notifyUser(onboarding.userId, 'Congratulations! Your onboarding has been approved. Welcome aboard!');

        // Send Welcome Email
        const user = await prisma.user.findUnique({ where: { id: onboarding.userId }, select: { email: true } });
        if (user?.email) {
            await sendEmail(
                user.email,
                'Welcome to Citrux HRMS!',
                welcomeEmailTemplate(onboarding.fullName || 'Employee', user.email)
            ).catch(err => console.error('[Email] Failed to send welcome email:', err));
        }

        res.json({ message: 'Approved and Profile Updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error approving onboarding' });
    }
};

