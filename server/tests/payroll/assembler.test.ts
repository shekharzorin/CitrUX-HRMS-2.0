import { Money } from '../../src/payroll/money';
import { WorkingDayCalendar } from '../../src/payroll/calendar/working-day-calendar';
import { computeGross, CalcInput } from '../../src/payroll/calc/calculator';
import { ComponentInput } from '../../src/payroll/components/resolver';
import { ComplianceAssembler, AssembleInput } from '../../src/payroll/compliance/assembler';
import {
    CompliancePack,
    CompliancePackResolver,
    ComplianceContext,
    ComplianceResult,
} from '../../src/payroll/compliance/contracts';

const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const PERIOD = { start: D('2026-06-01'), end: D('2026-06-30') };

function coreComputation(currency = 'USD') {
    const components: ComponentInput[] = [
        { code: 'BASIC', name: 'Basic', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 5_000_000n },
        { code: 'HRA', name: 'House Rent', kind: 'EARNING', calcMethod: 'PERCENT_OF_BASE', rateBps: 4000, baseComponentCode: 'BASIC' },
        { code: 'BONUS', name: 'Non-taxable Bonus', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 100_000n, taxable: false },
        { code: 'LOAN', name: 'Loan Repayment', kind: 'DEDUCTION', calcMethod: 'FIXED', amountMinor: 200_000n, prorate: false },
    ];
    const input: CalcInput = {
        currency,
        period: PERIOD,
        payFrequency: 'MONTHLY',
        prorationBasis: 'WORKING_DAY',
        calendar: new WorkingDayCalendar([0, 6], []),
        components,
        attendance: { presentWeight: 22, paidLeaveWeight: 0, unpaidLeaveWeight: 0 }, // full month, no proration
    };
    return computeGross(input, 'US');
}

function assembleInput(currency = 'USD'): AssembleInput {
    return {
        core: coreComputation(currency),
        profile: {
            userId: 'user-1',
            taxResidencyCountry: 'US',
            residencyStatus: 'CITIZEN',
            employmentType: 'FULL_TIME',
            compensationType: 'SALARIED',
            dateOfBirth: D('1990-01-01'),
            jurisdictionCodes: { work: 'US-CA', residence: 'US-NY' },
            statutoryIdentifiers: { SSN: '***' },
        },
        company: {
            companyId: 'company-A',
            countryCode: 'US',
            currency,
            fiscalYearStart: { month: 1, day: 1 },
            taxYearStart: { month: 1, day: 1 },
        },
        payDate: D('2026-06-30'),
        classificationsByCode: { BASIC: ['TAX_BASE'], HRA: ['TAX_BASE'] },
    };
}

/** A fake, country-agnostic pack: returns canned statutory lines. No real statutory logic. */
function fakePack(currency = 'USD'): CompliancePack {
    return {
        countryCode: 'US',
        version: 'test-1',
        asOfDatePolicy: () => 'PAY_DATE',
        requiredIdentifiers: () => [{ key: 'SSN', label: 'SSN', required: true }],
        validate: () => [],
        calculate: (_ctx: ComplianceContext): ComplianceResult => ({
            countryCode: 'US',
            employeeStatutory: [
                { code: 'EMP_TAX', name: 'Employee Tax', category: 'STATUTORY_EMPLOYEE', amount: Money.fromMajor('5000.00', currency) },
            ],
            employerContributions: [
                { code: 'ER_CONTRIB', name: 'Employer Contribution', category: 'STATUTORY_EMPLOYER', amount: Money.fromMajor('3000.00', currency) },
            ],
            explain: [{ code: 'EMP_TAX', explanation: 'fake' }],
        }),
    };
}

function resolverFor(pack: CompliancePack): CompliancePackResolver {
    return { resolve: () => ({ pack, ruleVersion: { version: pack.version, parameters: { slab: 1 } } }) };
}

describe('Phase 2.1 — ComplianceAssembler', () => {
    const assembler = new ComplianceAssembler();

    describe('buildContext', () => {
        it('maps Core outputs + profile/company into a ComplianceContext', () => {
            const ctx = assembler.buildContext(assembleInput());
            expect(ctx.countryCode).toBe('US');
            expect(ctx.currency).toBe('USD');
            expect(ctx.payFrequency).toBe('MONTHLY');
            expect(ctx.earnings.map((e) => e.code)).toEqual(['BASIC', 'HRA', 'BONUS']);
            expect(ctx.contractualDeductions.map((d) => d.code)).toEqual(['LOAN']);
            // gross = 50,000 + 20,000 + 1,000 = 71,000
            expect(ctx.grossPay.format()).toBe('71000.00');
            // taxableGross excludes the non-taxable BONUS: 50,000 + 20,000 = 70,000
            expect(ctx.taxableGross.format()).toBe('70000.00');
        });

        it('carries generic employee fields and component classifications through', () => {
            const ctx = assembler.buildContext(assembleInput());
            expect(ctx.employee.residencyStatus).toBe('CITIZEN');
            expect(ctx.employee.jurisdictionCodes).toEqual({ work: 'US-CA', residence: 'US-NY' });
            expect(ctx.company.taxYearStart).toEqual({ month: 1, day: 1 });
            const basic = ctx.earnings.find((e) => e.code === 'BASIC')!;
            expect(basic.classifications).toEqual(['TAX_BASE']);
            const bonus = ctx.earnings.find((e) => e.code === 'BONUS')!;
            expect(bonus.classifications).toEqual([]); // no entry -> empty, not undefined
        });
    });

    describe('merge + final net recompute', () => {
        it('merges CORE and PACK lines and recomputes net after employee statutory', () => {
            const core = coreComputation();
            const result = fakePack().calculate({} as ComplianceContext);
            const merged = assembler.merge(core, result);

            // Core gross 71,000; contractual deduction (LOAN) 2,000; pre-statutory net 69,000
            expect(merged.gross.format()).toBe('71000.00');
            expect(merged.contractualDeductionTotal.format()).toBe('2000.00');
            // employee statutory 5,000 -> total employee deductions 7,000 -> final net 64,000
            expect(merged.employeeStatutoryTotal.format()).toBe('5000.00');
            expect(merged.totalEmployeeDeductions.format()).toBe('7000.00');
            expect(merged.net.format()).toBe('64000.00');
            // employer contribution is cost only — excluded from net, reported separately
            expect(merged.employerCostTotal.format()).toBe('3000.00');

            const origins = new Set(merged.lines.map((l) => l.origin));
            expect(origins).toEqual(new Set(['CORE', 'PACK:US']));
            const statutory = merged.lines.filter((l) => l.origin === 'PACK:US');
            expect(statutory.map((l) => l.category)).toEqual(['STATUTORY_EMPLOYEE', 'STATUTORY_EMPLOYER']);
        });

        it('throws on a pack returning a mismatched currency (Money safety)', () => {
            const core = coreComputation('USD');
            const badResult: ComplianceResult = {
                countryCode: 'US',
                employeeStatutory: [
                    { code: 'X', name: 'X', category: 'STATUTORY_EMPLOYEE', amount: Money.fromMajor('1', 'INR') },
                ],
                employerContributions: [],
            };
            expect(() => assembler.merge(core, badResult)).toThrow(/currency mismatch/);
        });
    });

    describe('prepareYtdDeltas', () => {
        it('builds delta structures (gross, taxable, statutory) without persisting', () => {
            const ctx = assembler.buildContext(assembleInput());
            const result = fakePack().calculate(ctx);
            const deltas = assembler.prepareYtdDeltas(ctx, result);
            const byCode = Object.fromEntries(deltas.map((d) => [d.code, d.amount.format()]));
            expect(byCode['GROSS']).toBe('71000.00');
            expect(byCode['TAXABLE_GROSS']).toBe('70000.00');
            expect(byCode['EMP_TAX']).toBe('5000.00');
            expect(byCode['ER_CONTRIB']).toBe('3000.00');
        });
    });

    describe('assemble (full orchestration with injected resolver)', () => {
        it('runs context -> resolver -> calculate -> merge -> deltas and pins pack parameters', () => {
            const out = assembler.assemble(assembleInput(), resolverFor(fakePack()));
            expect(out.context.packParameters).toEqual({ slab: 1 });
            expect(out.net.format()).toBe('64000.00');
            expect(out.employerCostTotal.format()).toBe('3000.00');
            expect(out.result.countryCode).toBe('US');
            expect(out.ytdDeltas.length).toBeGreaterThan(0);
        });

        it('handles a multi-currency run end to end (INR)', () => {
            const out = assembler.assemble(assembleInput('INR'), resolverFor(fakePack('INR')));
            expect(out.gross.currency).toBe('INR');
            expect(out.net.currency).toBe('INR');
            expect(out.net.format()).toBe('64000.00');
        });
    });
});
