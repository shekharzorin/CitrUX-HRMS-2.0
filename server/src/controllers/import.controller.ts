import { Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';

/**
 * Bulk Import Controller
 * Allows HR/Admin to create multiple employees at once.
 * Expected format: Array of objects with email, firstName, lastName, designation, etc.
 * Tenant-scoped: imported users are always created in the CALLER's company.
 * Route is gated by requirePermission('MANAGE_USERS').
 */
export const bulkImportEmployees = async (req: AuthRequest, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        if (!companyId) return res.status(403).json({ message: 'Company context required' });
        const employees = req.body; // Expecting an array

        if (!Array.isArray(employees)) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array of employees.' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = 'Welcome@Citrux123';
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        for (const emp of employees) {
            try {
                const { email, firstName, lastName, designation, department, employeeId } = emp;

                if (!email || !firstName) {
                    results.failed++;
                    results.errors.push(`Missing required fields for ${email || 'unknown'}`);
                    continue;
                }

                // Check if user exists
                const existing = await prisma.user.findUnique({ where: { email } });
                if (existing) {
                    results.failed++;
                    results.errors.push(`User already exists: ${email}`);
                    continue;
                }

                const createdUser = await prisma.$transaction(async (tx) => {
                    const user = await tx.user.create({
                        data: {
                            email,
                            employeeId: employeeId || `EMP-${uuidv4().slice(0, 8).toUpperCase()}`,
                            passwordHash,
                            role: 'EMPLOYEE',
                            status: 'ACTIVE',
                            companyId, // always the caller's company — never cross-tenant
                        }
                    });

                    await tx.profile.create({
                        data: {
                            userId: user.id,
                            companyId,
                            firstName,
                            lastName: lastName || '',
                            designation: designation || '',
                            department: department || '',
                            employmentType: 'FULL_TIME',
                            dateOfJoining: new Date()
                        }
                    });
                    return user;
                });

                await AuditService.log(req.user!.userId, 'BULK_IMPORT_CREATE', 'USER', createdUser.id, { email, companyId });
                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Failed to import ${emp.email}: ${err.message}`);
            }
        }

        res.json({
            message: 'Bulk import completed',
            summary: results
        });
    } catch (error) {
        console.error('[Import] Bulk Import Error:', error);
        res.status(500).json({ message: 'Internal Server Error during bulk import' });
    }
};
