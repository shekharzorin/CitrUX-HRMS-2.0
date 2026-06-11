import { WorkingDayCalendar } from '../../src/payroll/calendar/working-day-calendar';
import { reduceAttendance } from '../../src/payroll/calc/payroll-calc.service';

const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const PERIOD = { start: D('2026-06-01'), end: D('2026-06-28') }; // Mon..Sun, 20 working days

describe('Payroll Core — attendance/leave reducer', () => {
    const cal = new WorkingDayCalendar([0, 6], []);

    it('counts present (full=1, half=0.5) on working days only', () => {
        const attendance = [
            ...['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'].map((d) => ({ date: D(d), status: 'PRESENT' })),
            ...['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12'].map((d) => ({ date: D(d), status: 'PRESENT' })),
            ...['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'].map((d) => ({ date: D(d), status: 'PRESENT' })),
            { date: D('2026-06-22'), status: 'PRESENT' }, // 16th present day
            { date: D('2026-06-23'), status: 'HALF_DAY' }, // +0.5
            { date: D('2026-06-06'), status: 'PRESENT' }, // Saturday — ignored
        ];
        const leaves = [
            { startDate: D('2026-06-24'), endDate: D('2026-06-25'), duration: 'FULL_DAY', isPaid: true }, // 2 working days
            { startDate: D('2026-06-26'), endDate: D('2026-06-26'), duration: 'FULL_DAY', isPaid: false }, // 1 working day
        ];

        const s = reduceAttendance(attendance, leaves, cal, PERIOD);
        expect(s.presentWeight).toBeCloseTo(16.5, 10);
        expect(s.paidLeaveWeight).toBeCloseTo(2, 10);
        expect(s.unpaidLeaveWeight).toBeCloseTo(1, 10);

        // Derived LOP (working basis) = 20 - 16.5 - 2 = 1.5
        const lop = 20 - s.presentWeight - s.paidLeaveWeight;
        expect(lop).toBeCloseTo(1.5, 10);
    });

    it('clips leave to the period and skips weekends/holidays', () => {
        const withHoliday = new WorkingDayCalendar([0, 6], ['2026-06-02']); // Tue holiday
        const leaves = [
            // spans before the period start and over a weekend + a holiday
            { startDate: D('2026-05-28'), endDate: D('2026-06-03'), duration: 'FULL_DAY', isPaid: true },
        ];
        const s = reduceAttendance([], leaves, withHoliday, PERIOD);
        // Working days in 06-01..06-03 minus the 06-02 holiday = 06-01, 06-03 => 2
        expect(s.paidLeaveWeight).toBeCloseTo(2, 10);
    });

    it('half-day leave duration weights 0.5 per working day', () => {
        const leaves = [
            { startDate: D('2026-06-01'), endDate: D('2026-06-01'), duration: 'FIRST_HALF', isPaid: true },
        ];
        const s = reduceAttendance([], leaves, cal, PERIOD);
        expect(s.paidLeaveWeight).toBeCloseTo(0.5, 10);
    });
});
