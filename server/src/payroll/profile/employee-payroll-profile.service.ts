/**
 * EmployeePayrollProfile service (Phase 1).
 *
 * Payroll-authoritative per-employee settings. Country-specific identifiers
 * (PAN/UAN, SSN, NINO, …) are stored generically in a Json column — there are
 * NO country-specific columns. Compliance Packs (Phase 2) interpret these.
 */
import { prisma } from '../../db';
import { AuditService } from '../../services/audit.service';
import { assertSameCompany } from '../../middlewares/tenant.middleware';
import type { AuthRequest } from '../../middlewares/auth.middleware';
import type { Response } from 'express';

export interface EmployeeProfileInput {
    taxResidencyCountry?: string | null;
    employmentType?: string;
    compensationType?: 'SALARIED' | 'HOURLY' | 'DAILY';
    payFrequencyOverride?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | null;
    exemptions?: unknown;
    statutoryIdentifiers?: unknown;
}

export class EmployeePayrollProfileService {
    static async get(companyId: string, userId: string) {
        const profile = await prisma.employeePayrollProfile.findUnique({ where: { userId } });
        if (profile && profile.companyId !== companyId) return null; // tenant isolation
        return profile;
    }

    /**
     * Upsert a profile. Verifies the target user belongs to the caller's tenant
     * before writing (service-level isolation, validated via assertSameCompany).
     */
    static async upsert(
        companyId: string,
        userId: string,
        input: EmployeeProfileInput,
        actorId: string,
        req: AuthRequest,
        res: Response
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return null;
        }
        if (!assertSameCompany(user.companyId, req, res)) return null;

        const data = {
            companyId,
            taxResidencyCountry: input.taxResidencyCountry ?? null,
            employmentType: input.employmentType ?? 'FULL_TIME',
            compensationType: input.compensationType ?? 'SALARIED',
            payFrequencyOverride: input.payFrequencyOverride ?? null,
            exemptions: (input.exemptions ?? undefined) as any,
            statutoryIdentifiers: (input.statutoryIdentifiers ?? undefined) as any,
        };
        const profile = await prisma.employeePayrollProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
        await AuditService.log(actorId, 'UPSERT', 'PAYROLL_EMP_PROFILE', profile.id, { companyId, userId });
        return profile;
    }
}
