import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { email, password, role, firstName, lastName, phone, designation, employmentType, joiningDate } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role || 'EMPLOYEE',
                profile: {
                    create: {
                        firstName,
                        lastName,
                        phone,
                        designation,
                        dateOfJoining: joiningDate ? new Date(joiningDate) : new Date(),
                    }
                }
            },
            include: { profile: true }
        });

        // Initialize Leave Balances
        try {
            const leaveTypes = await prisma.leaveType.findMany();
            if (leaveTypes.length > 0) {
                const balances = leaveTypes.map(lt => ({
                    userId: user.id,
                    leaveTypeId: lt.id,
                    balance: lt.daysPerYear,
                    used: 0
                }));
                await prisma.leaveBalance.createMany({ data: balances });
            }
        } catch (e) {
            console.error("Failed to init leave balances for user:", user.id, e);
        }

        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        console.log('GET /api/users HIT');
        console.log('CWD:', process.cwd());
        console.log('DATABASE_URL env:', process.env.DATABASE_URL);

        const count = await prisma.user.count();
        console.log('Prisma User Count:', count);

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                profile: true
                // Exclude passwordHash
            }
        });
        console.log(`Returning ${users.length} users`);
        res.json(users);
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
                onboarding: true,
                salary: true,
                attendance: {
                    orderBy: { date: 'desc' },
                    take: 5
                },
                leaveBalances: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role, firstName, lastName, phone, designation } = req.body;

        // First check if user exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'User not found' });

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role,
                profile: {
                    update: {
                        firstName,
                        lastName,
                        phone,
                        designation
                    }
                }
            },
            include: { profile: true }
        });

        const { passwordHash, ...userData } = updatedUser;
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Transaction to delete relations if necessary? 
        // Delete all related records first to satisfy foreign keys
        // Note: Using a transaction to ensure atomicity
        const deleteAttendance = prisma.attendance.deleteMany({ where: { userId: id } });
        const deleteLeaveBalance = prisma.leaveBalance.deleteMany({ where: { userId: id } });
        const deleteLeaveRequest = prisma.leaveRequest.deleteMany({ where: { userId: id } });
        // @ts-ignore
        const deleteSalary = prisma.salaryStructure.deleteMany({ where: { userId: id } });
        // @ts-ignore
        const deletePayslips = prisma.payslip.deleteMany({ where: { userId: id } });
        // @ts-ignore
        const deleteOnboarding = prisma.onboarding.deleteMany({ where: { userId: id } });
        const deleteNotifications = prisma.notification.deleteMany({ where: { userId: id } });
        const deleteGoals = prisma.goal.deleteMany({ where: { userId: id } });
        const deleteReviews = prisma.performanceReview.deleteMany({ where: { userId: id } });
        const deleteGivenReviews = prisma.performanceReview.deleteMany({ where: { reviewerId: id } });
        const deleteClaims = prisma.expenseClaim.deleteMany({ where: { userId: id } });
        const deleteAssets = prisma.asset.updateMany({ where: { assignedTo: id }, data: { assignedTo: null, status: 'AVAILABLE' } });

        const deleteProfile = prisma.profile.deleteMany({ where: { userId: id } });
        const deleteUser = prisma.user.delete({ where: { id } });

        await prisma.$transaction([
            deleteAttendance,
            deleteLeaveBalance,
            deleteLeaveRequest,
            deleteSalary,
            deletePayslips,
            deleteOnboarding,
            deleteNotifications,
            deleteGoals,
            deleteReviews,
            deleteGivenReviews,
            deleteClaims,
            deleteAssets,
            deleteProfile,
            deleteUser
        ]);

        res.json({ message: 'User and all related data deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
