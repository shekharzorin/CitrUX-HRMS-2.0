import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';

// ...existing code...
export const createUser = async (req: Request, res: Response) => {
    try {
        const { email, password, role, firstName, lastName, phone, designation, employmentType, joiningDate, employeeId } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let finalEmployeeId = employeeId;

        // Auto-generate Employee ID if not provided
        if (!finalEmployeeId) {
            try {
                // Use Raw SQL
                const settings = await prisma.$queryRaw`SELECT key, value FROM SystemSetting` as { key: string, value: string }[];
                const settingsMap = settings.reduce((acc: any, curr: any) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {} as Record<string, string>);

                if (settingsMap['EMP_ID_AUTO_GENERATE'] === 'true') {
                    const prefix = settingsMap['EMP_ID_PREFIX'] || 'EMP-';
                    const sequence = parseInt(settingsMap['EMP_ID_SEQUENCE'] || '1');
                    const padding = parseInt(settingsMap['EMP_ID_PADDING'] || '4');

                    finalEmployeeId = `${prefix}${sequence.toString().padStart(padding, '0')}`;

                    // Increment sequence atomically via Raw SQL
                    const nextVal = (sequence + 1).toString();
                    await prisma.$executeRaw`INSERT INTO SystemSetting (key, value) VALUES ('EMP_ID_SEQUENCE', ${nextVal}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
                }
            } catch (err) {
                console.error("Error auto-generating Employee ID:", err);
            }
        }

        if (finalEmployeeId) {
            const existingId = await prisma.user.findUnique({ where: { employeeId: finalEmployeeId.toString() } });
            if (existingId) {
                return res.status(400).json({ message: `User already exists with this Employee ID: ${finalEmployeeId}` });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                employeeId: finalEmployeeId ? finalEmployeeId.toString() : undefined,
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
                await (prisma as any).leaveBalance.createMany({ data: balances });
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

export const importUsers = async (req: Request, res: Response) => {
    try {
        const { users } = req.body; // Expects array of { firstName, lastName, email, role, phone, designation, password? }

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected array of users.' });
        }

        const leaveTypes = await prisma.leaveType.findMany();
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        let autoGenEnabled = false;
        let idPrefix = 'EMP-';
        let idSequence = 1;
        let idPadding = 4;
        let sequenceIncrement = 0;

        try {
            const settings = await prisma.$queryRaw`SELECT key, value FROM SystemSetting` as { key: string, value: string }[];
            const settingsMap = settings.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {} as Record<string, string>);
            if (settingsMap['EMP_ID_AUTO_GENERATE'] === 'true') {
                autoGenEnabled = true;
                idPrefix = settingsMap['EMP_ID_PREFIX'] || 'EMP-';
                idSequence = parseInt(settingsMap['EMP_ID_SEQUENCE'] || '1');
                idPadding = parseInt(settingsMap['EMP_ID_PADDING'] || '4');
            }
        } catch (e) {
            console.error("Failed to load settings for import:", e);
        }

        for (const u of users) {
            try {
                // Basic Validation
                if (!u.email || !u.firstName) {
                    results.failed++;
                    results.errors.push(`Missing email or name for record: ${JSON.stringify(u)}`);
                    continue;
                }

                // Check duplicate Email
                const existing = await prisma.user.findUnique({ where: { email: u.email } });
                if (existing) {
                    results.failed++;
                    results.errors.push(`User already exists: ${u.email}`);
                    continue;
                }

                // Map 'id', 'empid', or 'employeeId' to employeeId
                let empId = u.employeeId || u.id || u.empId;

                if (!empId && autoGenEnabled) {
                    empId = `${idPrefix}${(idSequence + sequenceIncrement).toString().padStart(idPadding, '0')}`;
                    sequenceIncrement++;
                }

                // Check duplicate Employee ID
                if (empId) {
                    const existingId = await prisma.user.findUnique({ where: { employeeId: empId.toString() } });
                    if (existingId) {
                        results.failed++;
                        results.errors.push(`Employee ID already exists: ${empId}`);
                        continue;
                    }
                }

                const salt = await bcrypt.genSalt(10);
                const defaultPassword = u.password || 'Citrux@123';
                const passwordHash = await bcrypt.hash(defaultPassword, salt);

                const newUser = await prisma.user.create({
                    data: {
                        email: u.email,
                        employeeId: empId ? empId.toString() : undefined,
                        passwordHash,
                        role: u.role ? u.role.toUpperCase() : 'EMPLOYEE',
                        profile: {
                            create: {
                                firstName: u.firstName,
                                lastName: u.lastName || '',
                                phone: u.phone,
                                designation: u.designation,
                                dateOfJoining: u.joiningDate ? new Date(u.joiningDate) : new Date()
                            }
                        }
                    }
                });

                // Init Balances
                if (leaveTypes.length > 0) {
                    const balances = leaveTypes.map(lt => ({
                        userId: newUser.id,
                        leaveTypeId: lt.id,
                        balance: lt.daysPerYear,
                        used: 0
                    }));
                    await (prisma as any).leaveBalance.createMany({ data: balances });
                }

                results.success++;

            } catch (err: any) {
                results.failed++;
                results.errors.push(`Error creating ${u.email}: ${err.message}`);
            }
        }

        // Update sequence if used
        if (sequenceIncrement > 0) {
            try {
                const nextVal = (idSequence + sequenceIncrement).toString();
                await prisma.$executeRaw`INSERT INTO SystemSetting (key, value) VALUES ('EMP_ID_SEQUENCE', ${nextVal}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
            } catch (e) {
                console.error("Failed to update ID sequence after import:", e);
            }
        }

        res.json({ message: 'Import processed', results });

    } catch (error) {
        console.error('Bulk Import Error:', error);
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
                employeeId: true,
                email: true,
                role: true,
                managerId: true,
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
        const { role, firstName, lastName, phone, designation, employeeId } = req.body;

        // First check if user exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'User not found' });

        if (employeeId && employeeId !== existing.employeeId) {
            const duplicate = await prisma.user.findUnique({ where: { employeeId: employeeId.toString() } });
            if (duplicate) {
                return res.status(400).json({ message: 'Employee ID already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role,
                employeeId: employeeId ? employeeId.toString() : undefined,
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

        // Check if attempting to delete Super Admin
        const userToDelete = await prisma.user.findUnique({ where: { id } });

        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (userToDelete.email === 'admin@citrux.com' || userToDelete.role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot delete Super Admin account' });
        }

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

        // Handle Nested Onboarding/Offboarding deletions
        // @ts-ignore
        const deleteOnboardingTasks = prisma.onboardingTask.deleteMany({ where: { onboarding: { userId: id } } });
        // @ts-ignore
        const deleteOnboarding = prisma.onboarding.deleteMany({ where: { userId: id } });

        // @ts-ignore
        const deleteExitInterview = prisma.exitInterview.deleteMany({ where: { offboarding: { userId: id } } });
        // @ts-ignore
        const deleteOffboarding = prisma.offboarding.deleteMany({ where: { userId: id } });

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
            deleteOnboardingTasks, // Delete tasks first
            deleteOnboarding,
            deleteExitInterview, // Delete interview first
            deleteOffboarding,
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
