import { WorkingDayCalendar } from '../../src/payroll/calendar/working-day-calendar';
import { computeGross, CalcInput, PayFrequency } from '../../src/payroll/calc/calculator';
import { ComponentInput } from '../../src/payroll/components/resolver';

const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const cal = new WorkingDayCalendar([0, 6], []);
const BASIC: ComponentInput[] = [
    { code: 'BASIC', name: 'Basic', kind: 'EARNING', calcMethod: 'FIXED', amountMinor: 1_000_000n }, // 10,000.00
];

// 2026-06-01 is a Monday.
const PERIODS: Array<{ freq: PayFrequency; start: string; end: string; workdays: number }> = [
    { freq: 'WEEKLY', start: '2026-06-01', end: '2026-06-07', workdays: 5 },
    { freq: 'BIWEEKLY', start: '2026-06-01', end: '2026-06-14', workdays: 10 },
    { freq: 'SEMI_MONTHLY', start: '2026-06-01', end: '2026-06-15', workdays: 11 },
    { freq: 'MONTHLY', start: '2026-06-01', end: '2026-06-30', workdays: 22 },
];

function input(freq: PayFrequency, start: string, end: string, presentWeight: number): CalcInput {
    return {
        currency: 'USD',
        period: { start: D(start), end: D(end) },
        payFrequency: freq,
        prorationBasis: 'WORKING_DAY',
        calendar: cal,
        components: BASIC,
        attendance: { presentWeight, paidLeaveWeight: 0, unpaidLeaveWeight: 0 },
    };
}

describe('Payroll Core — payroll frequencies', () => {
    it.each(PERIODS)('computes a full $freq period with no proration loss', ({ freq, start, end, workdays }) => {
        const r = computeGross(input(freq, start, end, workdays));
        expect(r.workingDays).toBe(workdays);
        expect(r.gross.format()).toBe('10000.00'); // full attendance => full pay regardless of frequency
        expect(r.complianceContext.payFrequency).toBe(freq);
    });

    it('prorates a WEEKLY period for one unpaid day (4 of 5 working days)', () => {
        const r = computeGross(input('WEEKLY', '2026-06-01', '2026-06-07', 4));
        expect(r.workingDays).toBe(5);
        expect(r.lopDays).toBe(1);
        // 10,000 * 4/5 = 8,000
        expect(r.gross.format()).toBe('8000.00');
    });

    it('prorates a SEMI_MONTHLY period (10 of 11 working days)', () => {
        const r = computeGross(input('SEMI_MONTHLY', '2026-06-01', '2026-06-15', 10));
        expect(r.workingDays).toBe(11);
        expect(r.lopDays).toBe(1);
        // 10,000 * 10/11 = 9,090.9090.. -> HALF_UP 9,090.91
        expect(r.gross.format()).toBe('9090.91');
    });
});
