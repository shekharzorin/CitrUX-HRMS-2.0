/**
 * EmployeePayrollProfile service (Phase 1, decoupled in Phase 2.1).
 *
 * Payroll-authoritative per-employee settings. Country-specific identifiers
 * (PAN/UAN, SSN, NINO, …), residency status and jurisdiction codes are stored
 * generically (Json / opaque strings) — there are NO country-specific columns.
 * Compliance Packs (Phase 2.4+) interpret them.
 *
 * This service is framework-agnostic: it no longer depends on Express req/res.
 * Tenant violations throw `PayrollTenantError` (controllers map it to 403),
 * so the service is unit-testable and reusable from any caller.
 */
import { prisma } from '../../db';
import { AuditService } from '../../services/audit.service';
import { PayrollTenantError } from '../run/payroll-run.service';

export class PayrollProfileError extends Error {}

export interface EmployeeProfileInput {
    taxResidencyCountry?: string | null;
    residencyStatus?: string | null;
    jurisdictionCodes?: Record<string, string | null | undefined> | null;
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
     * before writing; throws PayrollTenantError on cross-tenant access (no
     * Express coupling).
     */
    static async upsert(
        companyId: string,
        userId: string,
        input: EmployeeProfileInput,
        actorId: string
    ) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true },
        });
        if (!user) throw new PayrollProfileError('User not found');
        if (user.companyId !== companyId) throw new PayrollTenantError();

        const data = {
            companyId,
            taxResidencyCountry: input.taxResidencyCountry ?? null,
            residencyStatus: input.residencyStatus ?? null,
            jurisdictionCodes: (input.jurisdictionCodes ?? undefined) as any,
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
