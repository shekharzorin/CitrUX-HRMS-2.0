/**
 * DB-backed service tests for Payroll V2, hermetic via a mocked prisma client.
 * Exercises the real service code paths (tenant guards, immutability, profile
 * refactor) without touching Supabase.
 */
jest.mock('../../src/db', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        companyPayrollSettings: { findUnique: jest.fn() },
        salaryStructureV2: { findFirst: jest.fn(), findMany: jest.fn() },
        attendance: { findMany: jest.fn() },
        leaveRequest: { findMany: jest.fn() },
        holiday: { findMany: jest.fn() },
        payrollRun: { findUnique: jest.fn(), update: jest.fn() },
        employeePayrollProfile: { findUnique: jest.fn(), upsert: jest.fn() },
        auditLog: { create: jest.fn() },
    },
    Prisma: {},
    withRetry: (fn: any) => fn(),
    connectDB: jest.fn(),
}));

import { prisma } from '../../src/db';
import { PayrollCalcService, PayrollDataError } from '../../src/payroll/calc/payroll-calc.service';
import {
    EmployeePayrollProfileService,
    PayrollProfileError,
} from '../../src/payroll/profile/employee-payroll-profile.service';
import { PayrollTenantError } from '../../src/payroll/run/payroll-run.service';

// Typed view of the mocked client.
const db = prisma as unknown as {
    user: { findUnique: jest.Mock };
    companyPayrollSettings: { findUnique: jest.Mock };
    payrollRun: { findUnique: jest.Mock };
    employeePayrollProfile: { upsert: jest.Mock };
    auditLog: { create: jest.Mock };
};

const PERIOD = { start: new Date('2026-06-01T00:00:00Z'), end: new Date('2026-06-30T00:00:00Z') };

beforeEach(() => {
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
});

describe('Phase 2.1 — PayrollCalcService tenant isolation', () => {
    it('previewForUser blocks a user from another tenant', async () => {
        db.user.findUnique.mockResolvedValue({ companyId: 'company-B' });
        await expect(
            PayrollCalcService.previewForUser('company-A', 'user-1', PERIOD)
        ).rejects.toThrow(/Cross-tenant access blocked/);
    });

    it('previewForUser passes the tenant guard for a same-tenant user (then fails later for missing settings)', async () => {
        db.user.findUnique.mockResolvedValue({ companyId: 'company-A' });
        db.companyPayrollSettings.findUnique.mockResolvedValue(null); // not configured -> proves guard passed
        await expect(
            PayrollCalcService.previewForUser('company-A', 'user-1', PERIOD)
        ).rejects.toThrow(/not configured/);
    });

    it('previewForUser rejects a missing user', async () => {
        db.user.findUnique.mockResolvedValue(null);
        await expect(
            PayrollCalcService.previewForUser('company-A', 'user-1', PERIOD)
        ).rejects.toBeInstanceOf(PayrollDataError);
    });

    it('generateForRun blocks a run from another tenant', async () => {
        db.payrollRun.findUnique.mockResolvedValue({ id: 'run-1', companyId: 'company-B', status: 'DRAFT' });
        await expect(
            PayrollCalcService.generateForRun('company-A', 'run-1')
        ).rejects.toBeInstanceOf(PayrollTenantError);
    });

    it('generateForRun refuses to recompute an immutable (PUBLISHED) run', async () => {
        db.payrollRun.findUnique.mockResolvedValue({
            id: 'run-1',
            companyId: 'company-A',
            status: 'PUBLISHED',
            periodStart: PERIOD.start,
            periodEnd: PERIOD.end,
        });
        await expect(
            PayrollCalcService.generateForRun('company-A', 'run-1')
        ).rejects.toThrow(/cannot be recomputed/);
    });
});

describe('Phase 2.1 — EmployeePayrollProfileService (Express-decoupled)', () => {
    const input = {
        residencyStatus: 'PR',
        jurisdictionCodes: { work: 'SG', residence: 'SG' },
        statutoryIdentifiers: { NRIC: '***' },
    };

    it('blocks cross-tenant upsert and does not write', async () => {
        db.user.findUnique.mockResolvedValue({ companyId: 'company-B' });
        await expect(
            EmployeePayrollProfileService.upsert('company-A', 'user-1', input, 'actor-1')
        ).rejects.toBeInstanceOf(PayrollTenantError);
        expect(db.employeePayrollProfile.upsert).not.toHaveBeenCalled();
    });

    it('rejects a missing user with PayrollProfileError', async () => {
        db.user.findUnique.mockResolvedValue(null);
        await expect(
            EmployeePayrollProfileService.upsert('company-A', 'user-1', input, 'actor-1')
        ).rejects.toBeInstanceOf(PayrollProfileError);
    });

    it('upserts for a same-tenant user and persists the generic fields (no req/res needed)', async () => {
        db.user.findUnique.mockResolvedValue({ companyId: 'company-A' });
        db.employeePayrollProfile.upsert.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });

        const result = await EmployeePayrollProfileService.upsert('company-A', 'user-1', input, 'actor-1');

        expect(result).toEqual({ id: 'profile-1', userId: 'user-1' });
        const args = db.employeePayrollProfile.upsert.mock.calls[0][0];
        expect(args.create.residencyStatus).toBe('PR');
        expect(args.create.jurisdictionCodes).toEqual({ work: 'SG', residence: 'SG' });
        expect(db.auditLog.create).toHaveBeenCalled();
    });
});
