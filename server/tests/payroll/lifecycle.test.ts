import {
    canTransition,
    assertTransition,
    canRecompute,
    isImmutable,
    canReverse,
    PayrollRunStatus,
} from '../../src/payroll/run/lifecycle';
import { assertRunTenant, PayrollTenantError } from '../../src/payroll/run/payroll-run.service';

describe('Payroll Core — PayrollRun lifecycle state machine', () => {
    it('allows the documented forward path', () => {
        expect(canTransition('DRAFT', 'REVIEW')).toBe(true);
        expect(canTransition('REVIEW', 'LOCKED')).toBe(true);
        expect(canTransition('LOCKED', 'PUBLISHED')).toBe(true);
        expect(canTransition('LOCKED', 'REVERSED')).toBe(true);
        expect(canTransition('PUBLISHED', 'REVERSED')).toBe(true);
        expect(canTransition('REVIEW', 'DRAFT')).toBe(true); // reopen to recompute
    });

    it('rejects illegal transitions', () => {
        const illegal: Array<[PayrollRunStatus, PayrollRunStatus]> = [
            ['DRAFT', 'LOCKED'],
            ['DRAFT', 'PUBLISHED'],
            ['REVIEW', 'PUBLISHED'],
            ['LOCKED', 'DRAFT'],
            ['LOCKED', 'REVIEW'],
            ['PUBLISHED', 'LOCKED'],
            ['PUBLISHED', 'DRAFT'],
            ['REVERSED', 'DRAFT'],
            ['REVERSED', 'PUBLISHED'],
        ];
        for (const [from, to] of illegal) {
            expect(canTransition(from, to)).toBe(false);
            expect(() => assertTransition(from, to)).toThrow(/illegal transition/);
        }
    });

    it('marks DRAFT/REVIEW recomputable and LOCKED/PUBLISHED/REVERSED immutable', () => {
        expect(canRecompute('DRAFT')).toBe(true);
        expect(canRecompute('REVIEW')).toBe(true);
        expect(canRecompute('LOCKED')).toBe(false);
        expect(isImmutable('LOCKED')).toBe(true);
        expect(isImmutable('PUBLISHED')).toBe(true);
        expect(isImmutable('REVERSED')).toBe(true);
    });

    it('only allows reversal of committed runs', () => {
        expect(canReverse('LOCKED')).toBe(true);
        expect(canReverse('PUBLISHED')).toBe(true);
        expect(canReverse('DRAFT')).toBe(false);
        expect(canReverse('REVIEW')).toBe(false);
        expect(canReverse('REVERSED')).toBe(false);
    });
});

describe('Payroll Core — service-level tenant isolation guard', () => {
    it('passes a run owned by the tenant', () => {
        expect(() => assertRunTenant({ companyId: 'company-A' }, 'company-A')).not.toThrow();
    });

    it('blocks a run from another tenant', () => {
        expect(() => assertRunTenant({ companyId: 'company-B' }, 'company-A')).toThrow(PayrollTenantError);
    });

    it('blocks a missing run', () => {
        expect(() => assertRunTenant(null, 'company-A')).toThrow(PayrollTenantError);
    });
});
