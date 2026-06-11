/**
 * PayrollCalcService — tenant-scoped data loading + persistence around the pure
 * PayrollCalculatorV2 (calculator.ts). This is where Objective 7's service-level
 * tenant isolation lives: every load is scoped by companyId and the target user
 * is verified to belong to that tenant before any computation.
 *
 * Country-agnostic: no statutory logic. Persists only CORE earning/deduction
 * lines; Compliance Packs (Phase 2) will append PACK:<cc> statutory lines.
 */
import { prisma } from '../../db';
import { Money } from '../money';
import { WorkingDayCalendar } from '../calendar/working-day-calendar';
import { ProrationBasis, Period } from '../proration/proration';
import { ComponentInput } from '../components/resolver';
import { computeGross, AttendanceSummary, PayrollComputation } from './calculator';
import { CompanyPayrollSettingsService } from '../profile/company-payroll-settings.service';
import { PayrollRunService } from '../run/payroll-run.service';
import { canRecompute, PayrollRunStatus } from '../run/lifecycle';

export class PayrollDataError extends Error {}

/**
 * Pure reducer: attendance rows + approved leaves -> weighted day counts over the
 * working days of the period. Exported for unit testing. Present/leave on
 * non-working days is ignored (overtime is out of Phase-1 scope).
 */
export function reduceAttendance(
    attendance: Array<{ date: Date; status: string }>,
    leaves: Array<{ startDate: Date; endDate: Date; duration: string; isPaid: boolean }>,
    calendar: WorkingDayCalendar,
    period: Period
): AttendanceSummary {
    let presentWeight = 0;
    for (const row of attendance) {
        if (row.date < period.start || row.date > period.end) continue;
        if (!calendar.isWorkingDay(row.date)) continue;
        if (row.status === 'PRESENT') presentWeight += 1;
        else if (row.status === 'HALF_DAY') presentWeight += 0.5;
    }

    let paidLeaveWeight = 0;
    let unpaidLeaveWeight = 0;
    for (const leave of leaves) {
        const weightPerDay = leave.duration === 'FULL_DAY' ? 1 : 0.5;
        const from = leave.startDate > period.start ? leave.startDate : period.start;
        const to = leave.endDate < period.end ? leave.endDate : period.end;
        for (const day of calendar.eachDay(from, to)) {
            if (!calendar.isWorkingDay(day)) continue;
            if (leave.isPaid) paidLeaveWeight += weightPerDay;
            else unpaidLeaveWeight += weightPerDay;
        }
    }

    return { presentWeight, paidLeaveWeight, unpaidLeaveWeight };
}

function mapComponents(rows: any[]): ComponentInput[] {
    return rows.map((c) => ({
        code: c.code,
        name: c.name,
        kind: c.kind,
        calcMethod: c.calcMethod,
        amountMinor: c.amountMinor ?? null,
        currency: c.currency ?? null,
        rateBps: c.rateBps ?? null,
        baseComponentCode: c.baseComponentCode ?? null,
        formula: c.formula ?? null,
        taxable: c.taxable,
        prorate: c.prorate,
        sortOrder: c.sortOrder,
    }));
}

export class PayrollCalcService {
    /**
     * Compute (without persisting) one employee's payroll for a period.
     * Verifies the user belongs to `companyId` (service-level tenant isolation).
     */
    static async previewForUser(
        companyId: string,
        userId: string,
        period: Period,
        opts: { prorationBasis?: ProrationBasis } = {}
    ): Promise<PayrollComputation> {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
        if (!user) throw new PayrollDataError('User not found');
        if (user.companyId !== companyId) throw new PayrollDataError('Cross-tenant access blocked');

        const settings = await CompanyPayrollSettingsService.getOrThrow(companyId);

        const structure = await prisma.salaryStructureV2.findFirst({
            where: {
                userId,
                companyId,
                effectiveFrom: { lte: period.end },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.start } }],
            },
            orderBy: { effectiveFrom: 'desc' },
            include: { components: true },
        });
        if (!structure) throw new PayrollDataError(`No active salary structure for user ${userId}`);

        const calendar = await CompanyPayrollSettingsService.buildCalendar(companyId, period);

        const attendance = await prisma.attendance.findMany({
            where: { userId, date: { gte: period.start, lte: period.end } },
            select: { date: true, status: true },
        });
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId,
                status: 'APPROVED',
                startDate: { lte: period.end },
                endDate: { gte: period.start },
            },
            include: { leaveType: { select: { isPaid: true } } },
        });

        const summary = reduceAttendance(
            attendance,
            leaves.map((l) => ({
                startDate: l.startDate,
                endDate: l.endDate,
                duration: l.duration,
                isPaid: l.leaveType.isPaid,
            })),
            calendar,
            period
        );

        return computeGross(
            {
                currency: structure.currency,
                period,
                payFrequency: settings.payFrequency,
                prorationBasis: opts.prorationBasis ?? 'WORKING_DAY',
                calendar,
                components: mapComponents(structure.components),
                attendance: summary,
            },
            settings.countryCode
        );
    }

    /**
     * Generate (persist) payslips for every employee with an active structure in
     * a recomputable run. Tenant-scoped and blocked on LOCKED/PUBLISHED runs.
     */
    static async generateForRun(
        companyId: string,
        runId: string,
        opts: { prorationBasis?: ProrationBasis } = {}
    ) {
        const run = await PayrollRunService.getRun(companyId, runId);
        if (!canRecompute(run.status as PayrollRunStatus)) {
            throw new PayrollDataError(`Run ${runId} is ${run.status} and cannot be recomputed`);
        }

        const period: Period = { start: run.periodStart, end: run.periodEnd };
        const structures = await prisma.salaryStructureV2.findMany({
            where: {
                companyId,
                effectiveFrom: { lte: period.end },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.start } }],
            },
            select: { userId: true },
            distinct: ['userId'],
        });

        let grossTotal = 0n;
        let netTotal = 0n;
        let count = 0;

        for (const { userId } of structures) {
            const calc = await PayrollCalcService.previewForUser(companyId, userId, period, opts);

            await prisma.$transaction(async (tx) => {
                const payslip = await tx.payslipV2.upsert({
                    where: { payrollRunId_userId: { payrollRunId: runId, userId } },
                    create: {
                        payrollRunId: runId,
                        userId,
                        companyId,
                        currency: calc.currency,
                        grossMinor: calc.gross.amountMinor,
                        totalDeductionsMinor: calc.totalDeductions.amountMinor,
                        netMinor: calc.net.amountMinor,
                        status: 'DRAFT',
                        snapshot: calc.complianceContext as any,
                    },
                    update: {
                        currency: calc.currency,
                        grossMinor: calc.gross.amountMinor,
                        totalDeductionsMinor: calc.totalDeductions.amountMinor,
                        netMinor: calc.net.amountMinor,
                        status: 'DRAFT',
                        snapshot: calc.complianceContext as any,
                    },
                });
                await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
                await tx.payslipLine.createMany({
                    data: calc.lines.map((l) => ({
                        payslipId: payslip.id,
                        componentCode: l.componentCode,
                        name: l.name,
                        category: l.category,
                        amountMinor: l.amount.amountMinor,
                        currency: l.amount.currency,
                        taxable: l.taxable,
                        origin: l.origin,
                        sortOrder: l.sortOrder,
                    })),
                });
            });

            grossTotal += calc.gross.amountMinor;
            netTotal += calc.net.amountMinor;
            count++;
        }

        await prisma.payrollRun.update({
            where: { id: runId },
            data: {
                totals: {
                    employees: count,
                    grossMinor: grossTotal.toString(),
                    netMinor: netTotal.toString(),
                    currency: run.currency,
                } as any,
            },
        });

        return { count, grossMinor: grossTotal.toString(), netMinor: netTotal.toString() };
    }
}
