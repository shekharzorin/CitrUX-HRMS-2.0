/**
 * PayrollCalculatorV2 — the country-agnostic GROSS calculator (pure core).
 *
 * Responsibilities (Phase 1 only):
 *   - Resolve component-based earnings/deductions to exact Money.
 *   - Reduce attendance + paid/unpaid leave to payable vs LOP days.
 *   - Prorate against a configurable basis (calendar/working day).
 *   - Emit payslip line drafts + gross/net and a ComplianceContext-shaped
 *     object for Phase 2.
 *
 * Explicitly OUT of scope (by instruction): statutory deductions (PF/ESI/PT/TDS),
 * overtime, and any country-specific rule. Proration of earnings IS the LOP
 * mechanism — there is no separate LOP line (avoids the legacy double-count).
 *
 * This module is pure (no DB, no I/O) so it is fully unit-testable. Tenant
 * isolation and data loading live in the service layer that calls it.
 */
import { Money } from '../money';
import { WorkingDayCalendar } from '../calendar/working-day-calendar';
import { getProrationStrategy, ProrationBasis, Period } from '../proration/proration';
import { resolveComponents, ComponentInput, ResolvedComponent } from '../components/resolver';

export type PayFrequency = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY';

/**
 * Attendance/leave already reduced to weighted day counts over the WORKING days
 * of the period (full day = 1, half day = 0.5). `lopDays` is derived, not given:
 * any working day that is neither present nor on PAID leave is loss-of-pay
 * (this is where unpaid leave lands automatically).
 */
export interface AttendanceSummary {
    presentWeight: number; // present full=1 + half-day=0.5, summed
    paidLeaveWeight: number; // approved leave on a PAID leave type
    unpaidLeaveWeight: number; // approved leave on an UNPAID leave type (informational; already LOP)
}

export interface CalcInput {
    currency: string;
    period: Period;
    payFrequency: PayFrequency;
    prorationBasis: ProrationBasis;
    calendar: WorkingDayCalendar;
    components: ComponentInput[];
    attendance: AttendanceSummary;
}

export interface PayslipLineDraft {
    componentCode: string;
    name: string;
    category: 'EARNING' | 'DEDUCTION';
    amount: Money;
    taxable: boolean;
    origin: 'CORE';
    sortOrder: number;
}

export interface PayrollComputation {
    currency: string;
    period: Period;
    basis: ProrationBasis;
    totalDays: number;
    workingDays: number;
    lopDays: number;
    payableDays: number;
    lines: PayslipLineDraft[];
    gross: Money;
    totalDeductions: Money; // contractual only (Phase 1) — statutory added in Phase 2
    net: Money;
    /** Shape handed to Compliance Packs in Phase 2. No statutory math done here. */
    complianceContext: ComplianceContextDraft;
}

export interface ComplianceContextDraft {
    currency: string;
    countryCode?: string;
    period: Period;
    payFrequency: PayFrequency;
    grossEarnings: Array<{ code: string; name: string; amount: Money; taxable: boolean }>;
    grossMinor: string;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function computeGross(input: CalcInput, countryCode?: string): PayrollComputation {
    const { currency, period, calendar, components, attendance, prorationBasis, payFrequency } = input;

    const resolved: ResolvedComponent[] = resolveComponents(components, currency);
    const strategy = getProrationStrategy(prorationBasis);

    const totalDays = strategy.totalDays(period, calendar);
    const workingDays = calendar.workingDays(period.start, period.end);

    // LOP is measured in working days: any working day not present and not on
    // PAID leave loses pay. Unpaid leave falls in here automatically.
    const lopDays = clamp(
        workingDays - attendance.presentWeight - attendance.paidLeaveWeight,
        0,
        workingDays
    );
    const payableDays = clamp(totalDays - lopDays, 0, totalDays);

    const lines: PayslipLineDraft[] = [];
    const earnings: Money[] = [];
    const deductions: Money[] = [];

    for (const c of resolved) {
        const amount = c.prorate ? strategy.prorate(c.amount, payableDays, totalDays) : c.amount;
        if (c.kind === 'EARNING') earnings.push(amount);
        else deductions.push(amount);
        lines.push({
            componentCode: c.code,
            name: c.name,
            category: c.kind,
            amount,
            taxable: c.taxable,
            origin: 'CORE',
            sortOrder: c.sortOrder,
        });
    }

    const gross = Money.sum(earnings, currency);
    const totalDeductions = Money.sum(deductions, currency);
    const net = gross.subtract(totalDeductions);

    const complianceContext: ComplianceContextDraft = {
        currency,
        countryCode,
        period,
        payFrequency,
        grossEarnings: lines
            .filter((l) => l.category === 'EARNING')
            .map((l) => ({ code: l.componentCode, name: l.name, amount: l.amount, taxable: l.taxable })),
        grossMinor: gross.amountMinor.toString(),
    };

    return {
        currency,
        period,
        basis: prorationBasis,
        totalDays,
        workingDays,
        lopDays,
        payableDays,
        lines,
        gross,
        totalDeductions,
        net,
        complianceContext,
    };
}
