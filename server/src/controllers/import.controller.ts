import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bulk Import Controller
 * Allows HR/Admin to create multiple employees at once.
 * Expected format: Array of objects with email, firstName, lastName, designation, etc.
 */
export const bulkImportEmployees = async (req: Request, res: Response) => {
    try {
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

                await prisma.$transaction(async (tx) => {
                    const user = await tx.user.create({
                        data: {
                            email,
                            employeeId: employeeId || `EMP-${uuidv4().slice(0, 8).toUpperCase()}`,
                            passwordHash,
                            role: 'EMPLOYEE',
                            status: 'ACTIVE'
                        }
                    });

                    await tx.profile.create({
                        data: {
                            userId: user.id,
                            firstName,
                            lastName: lastName || '',
                            designation: designation || '',
                            department: department || '',
                            employmentType: 'FULL_TIME',
                            dateOfJoining: new Date()
                        }
                    });
                });

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
