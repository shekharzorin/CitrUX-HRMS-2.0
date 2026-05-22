import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import { requireString } from '../utils/requestUtils';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';
import { IdService } from '../services/id.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import logger from '../utils/logger';

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { 
            email, password, role, firstName, lastName, phone, designation, employmentType, joiningDate, employeeId, shiftId,
            branchId, departmentId, nationality, bloodGroup, gender, maritalStatus,
            presentAddress, permanentAddress, emergencyContactName, emergencyContactRelation,
            emergencyContactPhone, emergencyContactAlternate, emergencyContactAddress,
            aadhaarNumber, panNumber, uanNumber
        } = req.body;
        // Always derive companyId from the authenticated user's token — never trust req.body
        const companyId = req.user?.companyId ?? null;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Aadhaar format validation
        if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
            return res.status(400).json({ message: 'Aadhaar must be exactly 12 digits' });
        }

        // PAN format validation
        if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid PAN format. Must be 5 letters, 4 numbers, 1 letter.' });
        }

        if (aadhaarNumber) {
            const existingAadhaar = await prisma.profile.findFirst({ where: { aadhaarNumber } });
            if (existingAadhaar) return res.status(400).json({ message: 'Aadhaar Number already in use' });
        }

        if (panNumber) {
            const existingPan = await prisma.profile.findFirst({ where: { panNumber: panNumber.toUpperCase() } });
            if (existingPan) return res.status(400).json({ message: 'PAN Number already in use' });
        }

        let finalEmployeeId = employeeId;

        // Auto-generate Employee ID if not provided
        if (!finalEmployeeId) {
            try {
                if (await IdService.shouldAutoGenerate('EMP')) {
                    finalEmployeeId = await IdService.generateId('EMP');
                }
            } catch (err) {
                logger.error("Error auto-generating Employee ID:", err);
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
                role: role ? role.toUpperCase() : 'EMPLOYEE',
                companyId,  // ← Multi-tenant: always scoped to creator's company
                shiftId: shiftId || null,
                profile: {
                    create: {
                        firstName,
                        lastName,
                        phone,
                        designation,
                        employmentType,
                        branchId,
                        departmentId,
                        nationality,
                        bloodGroup,
                        gender,
                        maritalStatus,
                        presentAddress,
                        permanentAddress,
                        emergencyContactName,
                        emergencyContactRelation,
                        emergencyContactPhone,
                        emergencyContactAlternate,
                        emergencyContactAddress,
                        aadhaarNumber,
                        panNumber: panNumber ? panNumber.toUpperCase() : undefined,
                        uanNumber,
                        dateOfJoining: joiningDate ? new Date(joiningDate) : new Date(),
                        dob: req.body.dob ? new Date(req.body.dob) : undefined
                    }
                }
            },
            include: { profile: true, shift: true }
        });



        // Initialize Leave Balances
        try {
            const leaveTypes = await prisma.leaveType.findMany();
            if (leaveTypes.length > 0) {
                const balances = leaveTypes.map((lt: { id: string; daysPerYear: number }) => ({
                    userId: user.id,
                    leaveTypeId: lt.id,
                    balance: lt.daysPerYear,
                    used: 0
                }));
                await (prisma as any).leaveBalance.createMany({ data: balances });
            }
        } catch (e: any) {
            logger.error(`Failed to init leave balances for user: ${user.id}`, e);
        }

        const { passwordHash: _, ...userWithoutPassword } = user;
        
        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'CREATE',
            'EMPLOYEE',
            user.id,
            { email: user.email, role: user.role }
        );

        // Notify new employee
        await NotificationService.notify(
            user.id,
            `Welcome to the HRMS portal! Please complete your profile.`,
            'SYSTEM',
            '/profile'
        );

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        logger.error('Create User Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const importUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { users } = req.body;
        const companyId = req.user!.companyId;
        const scope = getTenantScope(req);

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected array of users.' });
        }

        const leaveTypes = await prisma.leaveType.findMany({ where: scope });
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        let autoGenEnabled = false;

        try {
            if (await IdService.shouldAutoGenerate('EMP')) {
                autoGenEnabled = true;
            }
        } catch (e) {
            logger.error("Failed to load settings for import:", e);
        }

        for (const u of users) {
            try {
                if (!u.email || !u.firstName) {
                    results.failed++;
                    results.errors.push(`Missing email or name for record: ${JSON.stringify(u)}`);
                    continue;
                }

                const existing = await prisma.user.findUnique({ where: { email: u.email } });
                if (existing) {
                    results.failed++;
                    results.errors.push(`User already exists: ${u.email}`);
                    continue;
                }

                let empId = u.employeeId || u.id || u.empId;

                if (!empId && autoGenEnabled) {
                    empId = await IdService.generateId('EMP');
                }

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
                        companyId, // ← Multi-tenant fix
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

                if (leaveTypes.length > 0) {
                    const balances = leaveTypes.map((lt: { id: string; daysPerYear: number }) => ({
                        userId: newUser.id,
                        leaveTypeId: lt.id,
                        balance: lt.daysPerYear,
                        used: 0
                    }));
                    await prisma.leaveBalance.createMany({ data: balances });
                }

                results.success++;

            } catch (err: any) {
                results.failed++;
                results.errors.push(`Error creating ${u.email}: ${err.message}`);
            }
        }

        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'CREATE',
            'EMPLOYEE_BULK',
            'bulk_import',
            { successCount: results.success, failedCount: results.failed }
        );

        res.json({ message: 'Import processed', results });

    } catch (error) {
        logger.error('Bulk Import Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        logger.info('GET /api/users HIT');
        const { role, userId } = req.user!;
        const tenantWhere = getTenantScope(req);  // { companyId: '...' } or {} for SUPER_ADMIN

        const archivedQuery = req.query.archived === 'true';
        let whereClause: any = { 
            ...tenantWhere,
            status: archivedQuery ? 'ARCHIVED' : { not: 'ARCHIVED' }
        };

        if (role === 'MANAGER') {
            // Managers only see their direct reports within the same company
            whereClause.managerId = userId;
        }
        // ADMIN, HR, SUPER_ADMIN, EMPLOYEE → see all users in their company (already scoped by tenantWhere)

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                employeeId: true,
                email: true,
                role: true,
                status: true,
                companyId: true,
                company: { select: { name: true } },
                managerId: true,
                profile: {
                    include: {
                        branch: true,
                        departmentRef: true
                    }
                }
            }
        });
        logger.info(`Returning ${users.length} users for role ${role} (companyId: ${req.user?.companyId})`);
        res.json(users);
    } catch (error) {
        logger.error('Error in getUsers:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                profile: {
                    include: {
                        branch: true,
                        departmentRef: true
                    }
                },
                onboarding: true,
                salary: true,
                attendance: {
                    orderBy: { date: 'desc' },
                    take: 5
                },
                leaveBalances: true,
                shift: true,
                company: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!assertSameCompany(user.companyId, req, res)) return;

        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id, 'User ID');
        const { 
            role, firstName, lastName, phone, designation, employeeId, dob, shiftId, employmentType,
            branchId, departmentId, nationality, bloodGroup, gender, maritalStatus,
            presentAddress, permanentAddress, emergencyContactName, emergencyContactRelation,
            emergencyContactPhone, emergencyContactAlternate, emergencyContactAddress,
            aadhaarNumber, panNumber, uanNumber, managerId, joiningDate
        } = req.body;
        const actorRole = req.user!.role;

        // First check if user exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(existing.companyId, req, res)) return;

        // Enforce Role Hierarchy
        if (actorRole.toUpperCase() === 'HR') {
            if (existing.role === 'ADMIN' || existing.role === 'SUPER_ADMIN' || existing.role === 'HR') {
                return res.status(403).json({ message: 'Insufficient permissions to modify this user' });
            }
            // Prevent promoting to Admin/HR
            if (role && (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'HR')) {
                return res.status(403).json({ message: 'Insufficient permissions to assign this role' });
            }
        }


        if (employeeId && employeeId !== existing.employeeId) {
            const duplicate = await prisma.user.findUnique({ where: { employeeId: employeeId.toString() } });
            if (duplicate) {
                return res.status(400).json({ message: 'Employee ID already in use' });
            }
        }

        // Aadhaar format validation
        if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
            return res.status(400).json({ message: 'Aadhaar must be exactly 12 digits' });
        }

        // PAN format validation
        if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid PAN format. Must be 5 letters, 4 numbers, 1 letter.' });
        }

        if (aadhaarNumber) {
            const existingAadhaar = await prisma.profile.findFirst({ where: { aadhaarNumber, userId: { not: id } } });
            if (existingAadhaar) return res.status(400).json({ message: 'Aadhaar Number already in use by another user' });
        }

        if (panNumber) {
            const existingPan = await prisma.profile.findFirst({ where: { panNumber: panNumber.toUpperCase(), userId: { not: id } } });
            if (existingPan) return res.status(400).json({ message: 'PAN Number already in use by another user' });
        }

        const dataToUpdate: any = {
            role: role ? role.toUpperCase() : undefined,
            employeeId: employeeId ? employeeId.toString() : undefined,
            managerId: managerId || null,
            profile: {
                update: {
                    firstName,
                    lastName,
                    phone: phone || null,
                    designation: designation || null,
                    employmentType,
                    branchId: branchId || null,
                    departmentId: departmentId || null,
                    nationality: nationality || null,
                    bloodGroup: bloodGroup || null,
                    gender: gender || null,
                    maritalStatus: maritalStatus || null,
                    presentAddress: presentAddress || null,
                    permanentAddress: permanentAddress || null,
                    emergencyContactName: emergencyContactName || null,
                    emergencyContactRelation: emergencyContactRelation || null,
                    emergencyContactPhone: emergencyContactPhone || null,
                    emergencyContactAlternate: emergencyContactAlternate || null,
                    emergencyContactAddress: emergencyContactAddress || null,
                    aadhaarNumber: aadhaarNumber || null,
                    panNumber: panNumber ? panNumber.toUpperCase() : undefined,
                    uanNumber: uanNumber || null,
                    dateOfJoining: joiningDate ? new Date(joiningDate) : undefined
                }
            }
        };

        if (shiftId !== undefined) {
            dataToUpdate.shiftId = shiftId || null;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
            include: { profile: true, shift: true }
        });

        // Update DOB via Raw SQL if provided
        if (dob && (updatedUser as any).profile) {
            try {
                const dobDate = new Date(dob);
                await prisma.profile.update({
                    where: { id: (updatedUser as any).profile.id },
                    data: { dob: dobDate }
                });
            } catch (e) {
                logger.error("Failed to update DOB", e);
            }
        }

        const { passwordHash, ...userData } = updatedUser;
        
        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'UPDATE',
            'EMPLOYEE',
            id,
            { fieldsUpdated: Object.keys(dataToUpdate.profile.update) }
        );

        res.json(userData);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
       }
};
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id, 'User ID');
        const actorRole = req.user!.role;

        // Check if attempting to delete
        const userToDelete = await prisma.user.findUnique({ where: { id } });

        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!assertSameCompany(userToDelete.companyId, req, res)) return;

        // Enforce Role Hierarchy
        if (actorRole.toUpperCase() === 'HR') {
            if (userToDelete.role === 'ADMIN' || userToDelete.role === 'SUPER_ADMIN' || userToDelete.role === 'HR') {
                return res.status(403).json({ message: 'Insufficient permissions to delete this user' });
            }
        }

        if (userToDelete.email === 'admin@citrux.com' || userToDelete.role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot delete Super Admin account' });
        }

        // 1. Update subordinates to remove manager reference
        const updateSubordinates = prisma.user.updateMany({
            where: { managerId: id },
            data: { managerId: null }
        });

        // 2. Detach Assets
        const detachAssets = prisma.asset.updateMany({
            where: { assignedTo: id },
            data: { assignedTo: null, status: 'AVAILABLE' }
        });

        // 3. Update User Status to ARCHIVED
        const archiveUser = prisma.user.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });

        await prisma.$transaction([
            updateSubordinates,
            detachAssets,
            archiveUser
        ]);

        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'DELETE',
            'EMPLOYEE',
            id,
            { email: userToDelete.email, archived: true }
        );

        res.json({ message: 'User archived successfully' });
    } catch (error: any) {
        logger.error('Delete User Error:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            code: error.code
        });
    }
};

export const restoreUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id, 'User ID');
        
        const userToRestore = await prisma.user.findUnique({ where: { id } });

        if (!userToRestore) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!assertSameCompany(userToRestore.companyId, req, res)) return;

        if (userToRestore.status !== 'ARCHIVED') {
            return res.status(400).json({ message: 'User is not archived' });
        }

        // Restore user to ACTIVE status
        const restoredUser = await prisma.user.update({
            where: { id },
            data: { status: 'ACTIVE' }
        });

        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'RESTORE',
            'EMPLOYEE',
            id,
            { email: userToRestore.email }
        );

        res.json({ message: 'User restored successfully', user: restoredUser });
    } catch (error: any) {
        logger.error('Restore User Error:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            code: error.code
        });
    }
};
