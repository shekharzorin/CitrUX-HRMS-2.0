import { Response } from 'express';
import { PayrollService } from '../services/payroll.service';
import { NotificationService } from '../services/notification.service';
import { AuditService } from '../services/audit.service';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';
import axios from 'axios';

export const calculatePayroll = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, month, year } = req.body;
        const scope = getTenantScope(req);

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const results: any[] = [];
        for (const userId of userIds) {
            try {
                // Verify user belongs to same company
                const targetUser = await prisma.user.findUnique({ where: { id: userId } });
                if (!targetUser || !assertSameCompany(targetUser.companyId, req, res)) {
                    results.push({ userId, error: 'Unauthorized or User not found' });
                    continue;
                }

                const calculation = await PayrollService.calculateForUser(userId, month, year);
                results.push({ 
                    user: { 
                        id: targetUser.id, 
                        employeeId: targetUser.employeeId, 
                        profile: await prisma.profile.findUnique({ where: { userId: targetUser.id } }) 
                    }, 
                    calculation 
                });
            } catch (error: any) {
                results.push({ userId, error: error.message });
            }
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const generatePayroll = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, month, year } = req.body;

        if (!userIds || !Array.isArray(userIds) || !month || !year) {
            return res.status(400).json({ message: 'Invalid input. Required: userIds[], month, year' });
        }

        const generated: any[] = [];
        for (const userId of userIds) {
            try {
                // Verify user belongs to same company
                const targetUser = await prisma.user.findUnique({ where: { id: userId } });
                if (!targetUser || !assertSameCompany(targetUser.companyId, req, res)) continue;

                const payslip = await PayrollService.generatePayslip(userId, month, year);
                generated.push(payslip);

                // NOTIFICATION: Payslip Ready
                await NotificationService.notify(userId, `Your payslip for ${month}/${year} is ready.`, 'INFO', '/payroll');
            } catch (error: any) {
                console.error(`Failed to generate payslip for ${userId}:`, error);
            }
        }

        // Audit Trail
        await AuditService.log(
            req.user!.userId,
            'CREATE',
            'PAYROLL',
            `batch_${month}_${year}`,
            { generatedCount: generated.length, month, year }
        );

        res.json({ message: 'Payroll generation completed', count: generated.length, generated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and Year required' });
        }

        const payslips = await prisma.payslip.findMany({
            where: {
                month: parseInt(month as string),
                year: parseInt(year as string),
                user: {
                    ...scope
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        employeeId: true,
                        email: true,
                        profile: {
                            select: { firstName: true, lastName: true, department: true, designation: true }
                        }
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        res.json(payslips);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadPayslip = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const payslip = await prisma.payslip.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
        if (!assertSameCompany(payslip.user.companyId, req, res)) return;

        const doc = await PayrollService.generatePdf(id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${id}.pdf`);

        doc.pipe(res);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollStats = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

        const m = parseInt(month as string);
        const y = parseInt(year as string);

        const totalEmployees = await prisma.user.count({ 
            where: { 
                status: 'ACTIVE',
                ...scope
            } 
        });

        const payslips = await prisma.payslip.findMany({
            where: { 
                month: m, 
                year: y,
                user: {
                    ...scope
                }
            }
        });

        const processedCount = payslips.length;
        const totalCost = payslips.reduce((sum, p) => sum + p.net, 0);

        res.json({
            totalEmployees,
            processedCount,
            pendingCount: totalEmployees - processedCount,
            totalCost
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- PHASE 3: Bank & Payroll Profile Management ---

export const validateIFSC = async (req: AuthRequest, res: Response) => {
    const { ifsc } = req.params;
    if (!ifsc || ifsc.length !== 11) {
        return res.status(400).json({ message: 'Invalid IFSC format' });
    }
    try {
        const response = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);
        res.json({
            bank: response.data.BANK,
            branch: response.data.BRANCH,
            address: response.data.ADDRESS,
            city: response.data.CITY
        });
    } catch (error: any) {
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'IFSC Code not found' });
        }
        res.status(500).json({ message: 'Error validating IFSC' });
    }
};

export const getPayrollInfo = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const requesterRole = req.user!.role;
        const requesterId = req.user!.userId;
        
        const targetUser = await prisma.user.findUnique({ 
            where: { id: userId },
            include: { 
                profile: true,
                salary: true
            }
        });

        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // RBAC Check
        if (requesterRole === 'EMPLOYEE' && targetUser.id !== requesterId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (requesterRole === 'MANAGER' && targetUser.managerId !== requesterId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Masking logic based on role
        let bankAccount = targetUser.profile?.accountNumber;
        let ctc = targetUser.salary?.ctc;

        if (requesterRole === 'MANAGER') {
            // Manager cannot see full account number or CTC (company policy choice, let's say they can't see account num at all)
            bankAccount = bankAccount ? '********' + bankAccount.slice(-4) : null;
        }

        res.json({
            profile: {
                bankName: targetUser.profile?.bankName,
                accountNumber: bankAccount,
                ifscCode: targetUser.profile?.ifscCode,
                bankBranch: targetUser.profile?.bankBranch,
                bankAddress: targetUser.profile?.bankAddress,
                paymentMode: targetUser.profile?.paymentMode,
                uanNumber: targetUser.profile?.uanNumber,
                pf: targetUser.salary?.pf,
                esi: targetUser.salary?.esi,
            },
            salary: (requesterRole === 'MANAGER') ? null : targetUser.salary 
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePayrollInfo = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const requesterRole = req.user!.role;
        const requesterId = req.user!.userId;
        
        const { 
            bankName, accountNumber, ifscCode, bankBranch, bankAddress, paymentMode, uanNumber,
            basic, hra, da, allowances, pf, esi, professionalTax, deductions, ctc
        } = req.body;

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // Employees can only update their own BANK details (not salary). 
        // Managers cannot update payroll info at all.
        // Admins/HR can update everything.
        
        if (requesterRole === 'MANAGER') {
            return res.status(403).json({ message: 'Managers cannot modify payroll data' });
        }
        if (requesterRole === 'EMPLOYEE' && targetUser.id !== requesterId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check duplicates for account number
        if (accountNumber && !accountNumber.includes('*')) {
            const duplicateAccount = await prisma.profile.findFirst({
                where: { accountNumber, userId: { not: userId } }
            });
            if (duplicateAccount) {
                return res.status(400).json({ message: 'This account number is already linked to another employee.' });
            }
        }

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_PAYROLL_INFO',
                entityType: 'PAYROLL',
                entityId: userId,
                details: `Payroll/Bank details updated for user ${userId}`,
                performedBy: requesterId
            }
        });

        // Update Profile (Bank details)
        const profileUpdateData: any = {};
        if (bankName !== undefined) profileUpdateData.bankName = bankName;
        if (accountNumber !== undefined && !accountNumber.includes('*')) profileUpdateData.accountNumber = accountNumber;
        if (ifscCode !== undefined) profileUpdateData.ifscCode = ifscCode;
        if (bankBranch !== undefined) profileUpdateData.bankBranch = bankBranch;
        if (bankAddress !== undefined) profileUpdateData.bankAddress = bankAddress;
        if (paymentMode !== undefined) profileUpdateData.paymentMode = paymentMode;
        if (uanNumber !== undefined) profileUpdateData.uanNumber = uanNumber;

        if (Object.keys(profileUpdateData).length > 0) {
            await prisma.profile.update({
                where: { userId },
                data: profileUpdateData
            });
        }

        // Update Salary (Only Admins/HR)
        if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(requesterRole)) {
            const hasSalaryData = [basic, hra, da, allowances, pf, esi, professionalTax, deductions, ctc].some(v => v !== undefined);
            if (hasSalaryData) {
                await prisma.salaryStructure.upsert({
                    where: { userId },
                    update: {
                        basic: basic ?? undefined,
                        hra: hra ?? undefined,
                        da: da ?? undefined,
                        allowances: allowances ?? undefined,
                        pf: pf ?? undefined,
                        esi: esi ?? undefined,
                        professionalTax: professionalTax ?? undefined,
                        deductions: deductions ?? undefined,
                        ctc: ctc ?? undefined
                    },
                    create: {
                        userId,
                        basic: basic ?? 0,
                        hra: hra ?? 0,
                        da: da ?? 0,
                        allowances: allowances ?? 0,
                        pf: pf ?? 0,
                        esi: esi ?? 0,
                        professionalTax: professionalTax ?? 0,
                        deductions: deductions ?? 0,
                        ctc: ctc ?? 0
                    }
                });
            }
        }

        res.json({ message: 'Payroll information updated successfully' });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
