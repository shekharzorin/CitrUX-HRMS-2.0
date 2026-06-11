/**
 * Proration strategies for Payroll Core (country-agnostic).
 *
 * Replaces the legacy single `gross / totalDays` calendar-day basis. The
 * strategy decides the DENOMINATOR basis (calendar days vs working days);
 * the calculator supplies payable vs total days in that basis. All arithmetic
 * goes through Money.mulRatio (exact integer math) — fractional days (half-day
 * = 0.5) are represented as integer "half-units" so nothing touches a float.
 *
 * NO country-specific rules and NO overtime here — just two neutral bases.
 */
import { Money, Rounding } from '../money';
import { WorkingDayCalendar } from '../calendar/working-day-calendar';

export type ProrationBasis = 'CALENDAR_DAY' | 'WORKING_DAY';

export interface Period {
    start: Date;
    end: Date;
}

export interface ProrationStrategy {
    readonly basis: ProrationBasis;
    /** Denominator: total days in the period under this basis. */
    totalDays(period: Period, calendar: WorkingDayCalendar): number;
    /** full * payableDays / totalDays, exact (half-day granularity), HALF_UP. */
    prorate(full: Money, payableDays: number, totalDays: number): Money;
}

function prorateByDays(
    full: Money,
    payableDays: number,
    totalDays: number,
    mode: Rounding = Rounding.HALF_UP
): Money {
    if (totalDays <= 0) return Money.zero(full.currency);
    if (payableDays >= totalDays) return full;
    if (payableDays <= 0) return Money.zero(full.currency);
    // Scale to half-units so 0.5-day granularity stays integer.
    const num = BigInt(Math.round(payableDays * 2));
    const den = BigInt(Math.round(totalDays * 2));
    return full.mulRatio(num, den, mode);
}

/** Prorate against total CALENDAR days in the period (incl. weekends/holidays). */
export class CalendarDayProration implements ProrationStrategy {
    readonly basis: ProrationBasis = 'CALENDAR_DAY';
    totalDays(period: Period, calendar: WorkingDayCalendar): number {
        return calendar.calendarDays(period.start, period.end);
    }
    prorate(full: Money, payableDays: number, totalDays: number): Money {
        return prorateByDays(full, payableDays, totalDays);
    }
}

/** Prorate against total WORKING days in the period (excl. weekends/holidays). */
export class WorkingDayProration implements ProrationStrategy {
    readonly basis: ProrationBasis = 'WORKING_DAY';
    totalDays(period: Period, calendar: WorkingDayCalendar): number {
        return calendar.workingDays(period.start, period.end);
    }
    prorate(full: Money, payableDays: number, totalDays: number): Money {
        return prorateByDays(full, payableDays, totalDays);
    }
}

export function getProrationStrategy(basis: ProrationBasis): ProrationStrategy {
    return basis === 'WORKING_DAY' ? new WorkingDayProration() : new CalendarDayProration();
}
