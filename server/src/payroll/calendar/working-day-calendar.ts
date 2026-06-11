/**
 * WorkingDayCalendar — country-agnostic working-day abstraction for Payroll Core.
 *
 * Replaces the legacy hardcoded `day === 0 || day === 6` weekend loop. The
 * weekend pattern is DATA (CompanyPayrollSettings.weekendDays, 0=Sun..6=Sat),
 * and holidays come from the existing company-scoped `Holiday` table — so a
 * Fri/Sat weekend (e.g. parts of the Gulf) or any holiday set is configuration,
 * not code.
 *
 * All dates are handled in UTC to match how attendance `businessDate` /
 * `Attendance.date` are stored (UTC midnight).
 */

const DEFAULT_WEEKEND = [0, 6]; // Sun, Sat

function toUtcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** 'YYYY-MM-DD' key in UTC. */
export function dayKey(d: Date): string {
    return toUtcMidnight(d).toISOString().slice(0, 10);
}

export class WorkingDayCalendar {
    private readonly weekend: Set<number>;
    private readonly holidays: Set<string>;

    /**
     * @param weekendDays day-of-week numbers that are weekends (0=Sun..6=Sat)
     * @param holidays    holiday dates (Date at any UTC time, or 'YYYY-MM-DD')
     */
    constructor(weekendDays: number[] = DEFAULT_WEEKEND, holidays: Array<Date | string> = []) {
        this.weekend = new Set(weekendDays.length ? weekendDays : DEFAULT_WEEKEND);
        this.holidays = new Set(
            holidays.map((h) => (typeof h === 'string' ? h.slice(0, 10) : dayKey(h)))
        );
    }

    isWeekend(d: Date): boolean {
        return this.weekend.has(toUtcMidnight(d).getUTCDay());
    }

    isHoliday(d: Date): boolean {
        return this.holidays.has(dayKey(d));
    }

    isWorkingDay(d: Date): boolean {
        return !this.isWeekend(d) && !this.isHoliday(d);
    }

    /** Iterate each UTC day in [start, end] inclusive. */
    *eachDay(start: Date, end: Date): Generator<Date> {
        let cur = toUtcMidnight(start);
        const last = toUtcMidnight(end);
        while (cur.getTime() <= last.getTime()) {
            yield new Date(cur.getTime());
            cur = new Date(cur.getTime() + 86_400_000);
        }
    }

    /** Total calendar days in [start, end] inclusive. */
    calendarDays(start: Date, end: Date): number {
        const a = toUtcMidnight(start).getTime();
        const b = toUtcMidnight(end).getTime();
        if (b < a) return 0;
        return Math.floor((b - a) / 86_400_000) + 1;
    }

    /** Working days (non-weekend, non-holiday) in [start, end] inclusive. */
    workingDays(start: Date, end: Date): number {
        let count = 0;
        for (const d of this.eachDay(start, end)) {
            if (this.isWorkingDay(d)) count++;
        }
        return count;
    }
}
