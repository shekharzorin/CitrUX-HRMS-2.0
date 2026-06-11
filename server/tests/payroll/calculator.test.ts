import { Money } from '../../src/payroll/money';
import { WorkingDayCalendar } from '../../src/payroll/calendar/working-day-calendar';
import { computeGross, CalcInput } from '../../src/payroll/calc/calculator';
import { ComponentInput } from '../../src/payroll/components/resolver';

const D = (s: string) => new Date(`${s}T00:00:00.000Z`);

// 2026-06-01 is a Monday; 06-01..06-28 is exactly 4 weeks => 20 working days (Sat/Sun off).
const PERIOD = { start: D('2026-06-01'), end: D('2026-06-28') };

function components(): ComponentInput[] {
    return [
        { code: 'BASIC', name: 'Basic', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 5_000_000n },
        { code: 'HRA', name: 'House Rent', kind: 'EARNING', calcMethod: 'PERCENT_OF_BASE', rateBps: 4000, baseComponentCode: 'BASIC' },
        { code: 'DA', name: 'Dearness Allowance', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 500_000n },
        { code: 'SPECIAL', name: 'Special', kind: 'EARNING', calcMethod: 'FORMULA', formula: 'BASIC * 0.1' },
    ];
}

function baseInput(overrides: Partial<CalcInput> = {}): CalcInput {
    return {
        currency: 'USD',
        period: PERIOD,
        payFrequency: 'MONTHLY',
        prorationBasis: 'WORKING_DAY',
        calendar: new WorkingDayCalendar([0, 6], []),
        components: components(),
        attendance: { presentWeight: 20, paidLeaveWeight: 0, unpaidLeaveWeight: 0 },
        ...overrides,
    };
}

describe('Payroll Core — PayrollCalculatorV2 (gross only)', () => {
    it('computes gross as the sum of ALL earnings incl. DA (no dropped component)', () => {
        const r = computeGross(baseInput());
        // 50,000 + 20,000 (40% of basic) + 5,000 + 5,000 (10% of basic) = 80,000
        expect(r.gross.format()).toBe('80000.00');
        const codes = r.lines.map((l) => l.componentCode);
        expect(codes).toEqual(expect.arrayContaining(['BASIC', 'HRA', 'DA', 'SPECIAL']));
        expect(r.workingDays).toBe(20);
        expect(r.totalDays).toBe(20);
        expect(r.lopDays).toBe(0);
        expect(r.payableDays).toBe(20);
    });

    it('is multi-currency (currency flows through; 0-decimal handled)', () => {
        const r = computeGross(baseInput({ currency: 'JPY' }));
        // JPY has 0 minor units; BASIC 5,000,000 minor = ¥5,000,000
        expect(r.currency).toBe('JPY');
        expect(r.lines.every((l) => l.amount.currency === 'JPY')).toBe(true);
        // gross = 5,000,000 + 2,000,000 + 500,000 + 500,000 = 8,000,000
        expect(r.gross.format()).toBe('8000000');
    });

    it('treats PAID leave as no loss of pay', () => {
        const r = computeGross(
            baseInput({ attendance: { presentWeight: 16, paidLeaveWeight: 4, unpaidLeaveWeight: 0 } })
        );
        expect(r.lopDays).toBe(0);
        expect(r.gross.format()).toBe('80000.00');
    });

    it('treats UNPAID leave as LOP and prorates earnings (working-day basis)', () => {
        const r = computeGross(
            baseInput({ attendance: { presentWeight: 16, paidLeaveWeight: 0, unpaidLeaveWeight: 4 } })
        );
        expect(r.lopDays).toBe(4);
        expect(r.payableDays).toBe(16);
        // 80,000 * 16/20 = 64,000
        expect(r.gross.format()).toBe('64000.00');
        // BASIC line prorated: 50,000 * 16/20 = 40,000
        const basic = r.lines.find((l) => l.componentCode === 'BASIC')!;
        expect(basic.amount.format()).toBe('40000.00');
    });

    it('weights HALF_DAY attendance as 0.5', () => {
        const r = computeGross(
            baseInput({ attendance: { presentWeight: 19.5, paidLeaveWeight: 0, unpaidLeaveWeight: 0 } })
        );
        expect(r.lopDays).toBeCloseTo(0.5, 10);
        // 50,000 * 19.5/20 = 48,750
        const basic = r.lines.find((l) => l.componentCode === 'BASIC')!;
        expect(basic.amount.format()).toBe('48750.00');
    });

    it('supports CALENDAR_DAY proration basis (LOP still measured in working days)', () => {
        const r = computeGross(
            baseInput({
                prorationBasis: 'CALENDAR_DAY',
                attendance: { presentWeight: 16, paidLeaveWeight: 0, unpaidLeaveWeight: 4 },
            })
        );
        expect(r.totalDays).toBe(28); // calendar days in the period
        expect(r.lopDays).toBe(4);
        expect(r.payableDays).toBe(24);
        // BASIC 50,000 * 24/28 = 42,857.142857 -> HALF_UP 42,857.14
        const basic = r.lines.find((l) => l.componentCode === 'BASIC')!;
        expect(basic.amount.format()).toBe('42857.14');
    });

    it('does not prorate components flagged prorate=false', () => {
        const comps: ComponentInput[] = [
            ...components(),
            { code: 'REIMB', name: 'Reimbursement', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 100_000n, prorate: false },
        ];
        const r = computeGross(
            baseInput({
                components: comps,
                attendance: { presentWeight: 16, paidLeaveWeight: 0, unpaidLeaveWeight: 4 },
            })
        );
        const reimb = r.lines.find((l) => l.componentCode === 'REIMB')!;
        expect(reimb.amount.format()).toBe('1000.00'); // untouched by LOP
    });

    it('subtracts contractual (non-statutory) deductions from net', () => {
        const comps: ComponentInput[] = [
            { code: 'BASIC', name: 'Basic', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 5_000_000n },
            { code: 'LOAN', name: 'Loan Repayment', kind: 'DEDUCTION', calcMethod: 'FIXED', amountMinor: 200_000n, prorate: false },
        ];
        const r = computeGross(baseInput({ components: comps }));
        expect(r.gross.format()).toBe('50000.00');
        expect(r.totalDeductions.format()).toBe('2000.00');
        expect(r.net.format()).toBe('48000.00');
    });

    it('excludes holidays from working days', () => {
        const withHoliday = new WorkingDayCalendar([0, 6], ['2026-06-03']); // a Wednesday
        const r = computeGross(baseInput({ calendar: withHoliday }));
        expect(r.workingDays).toBe(19);
    });

    it('emits a ComplianceContext-shaped payload with NO statutory math', () => {
        const r = computeGross(baseInput(), 'IN');
        expect(r.complianceContext.countryCode).toBe('IN');
        expect(r.complianceContext.currency).toBe('USD');
        expect(r.complianceContext.grossEarnings.map((e) => e.code)).toEqual(
            expect.arrayContaining(['BASIC', 'HRA', 'DA', 'SPECIAL'])
        );
        // No statutory categories produced by Core.
        expect(r.lines.every((l) => l.origin === 'CORE')).toBe(true);
    });

    it('detects cyclic and unknown component references', () => {
        const cyclic: ComponentInput[] = [
            { code: 'A', name: 'A', kind: 'EARNING', calcMethod: 'FORMULA', formula: 'B + 1' },
            { code: 'B', name: 'B', kind: 'EARNING', calcMethod: 'FORMULA', formula: 'A + 1' },
        ];
        expect(() => computeGross(baseInput({ components: cyclic }))).toThrow(/cyclic/);

        const unknown: ComponentInput[] = [
            { code: 'A', name: 'A', kind: 'EARNING', calcMethod: 'PERCENT_OF_BASE', rateBps: 1000, baseComponentCode: 'NOPE' },
        ];
        expect(() => computeGross(baseInput({ components: unknown }))).toThrow(/unknown component/);
    });
});
