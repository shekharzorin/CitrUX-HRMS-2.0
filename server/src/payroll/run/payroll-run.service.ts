/**
 * PayrollRunService — DB-backed lifecycle operations for Payroll Core.
 *
 * Wraps the pure lifecycle state machine with:
 *   - multi-tenant isolation (every op is scoped by companyId; cross-tenant
 *     access throws, enforced at the SERVICE layer — not just the controller),
 *   - immutability of LOCKED/PUBLISHED runs,
 *   - audit logging on every transition (reuses AuditService),
 *   - a maker-checker seam (transitions accept an actorId; LOCK/PUBLISH are the
 *     points a distinct approver permission will gate in a later phase).
 *
 * Country-agnostic: contains no statutory logic.
 */
import { prisma } from '../../db';
import { AuditService } from '../../services/audit.service';
import {
    PayrollRunStatus,
    assertTransition,
    canReverse,
} from './lifecycle';

export class PayrollTenantError extends Error {
    constructor(message = 'PayrollRun: cross-tenant access blocked') {
        super(message);
        this.name = 'PayrollTenantError';
    }
}

export interface CreateRunInput {
    periodStart: Date;
    periodEnd: Date;
    payFrequency: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY';
    currency: string;
    payDate?: Date | null;
    compliancePackVersion?: string | null;
}

/** Pure tenant guard — throws if the run does not belong to `companyId`. */
export function assertRunTenant(
    run: { companyId: string } | null | undefined,
    companyId: string
): asserts run {
    if (!run || run.companyId !== companyId) {
        throw new PayrollTenantError();
    }
}

export class PayrollRunService {
    /** Create a new DRAFT run for the tenant. */
    static async createDraft(companyId: string, input: CreateRunInput, actorId: string) {
        const run = await prisma.payrollRun.create({
            data: {
                companyId,
                periodStart: input.periodStart,
                periodEnd: input.periodEnd,
                payFrequency: input.payFrequency,
                currency: input.currency.toUpperCase(),
                payDate: input.payDate ?? null,
                compliancePackVersion: input.compliancePackVersion ?? null,
                status: 'DRAFT',
                createdById: actorId,
            },
        });
        await AuditService.log(actorId, 'CREATE', 'PAYROLL_RUN', run.id, {
            companyId,
            period: `${input.periodStart.toISOString()}..${input.periodEnd.toISOString()}`,
            payFrequency: input.payFrequency,
        });
        return run;
    }

    /** Fetch a run, asserting it belongs to the caller's tenant. */
    static async getRun(companyId: string, runId: string) {
        const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
        assertRunTenant(run, companyId);
        return run;
    }

    /**
     * Transition a run. Enforces the lifecycle rules, tenant scope, immutability
     * and audit. REVERSE additionally spawns a fresh DRAFT run (the reprocess
     * target) and never edits the reversed run.
     */
    static async transition(
        companyId: string,
        runId: string,
        to: PayrollRunStatus,
        actorId: string
    ) {
        const run = await PayrollRunService.getRun(companyId, runId);
        const from = run.status as PayrollRunStatus;
        assertTransition(from, to);

        const now = new Date();
        const data: Record<string, unknown> = { status: to };

        if (to === 'LOCKED') {
            data.lockedById = actorId;
            data.lockedAt = now;
        } else if (to === 'PUBLISHED') {
            data.publishedById = actorId;
            data.publishedAt = now;
            data.payDate = run.payDate ?? now;
        } else if (to === 'REVERSED') {
            data.reversedById = actorId;
            data.reversedAt = now;
        }

        const updated = await prisma.$transaction(async (tx) => {
            const u = await tx.payrollRun.update({ where: { id: runId }, data });

            // Publishing freezes the payslips (write-once visibility to employees).
            if (to === 'PUBLISHED') {
                await tx.payslipV2.updateMany({
                    where: { payrollRunId: runId },
                    data: { status: 'PUBLISHED', payDate: (data.payDate as Date) ?? now },
                });
            }
            return u;
        });

        await AuditService.log(actorId, `PAYROLL_${to}`, 'PAYROLL_RUN', runId, {
            companyId,
            from,
            to,
        });

        return updated;
    }

    /**
     * Reverse a committed run: marks it REVERSED and creates a NEW DRAFT run for
     * the same period (reprocess target). The reversed run is never edited.
     */
    static async reverse(companyId: string, runId: string, actorId: string, reason?: string) {
        const run = await PayrollRunService.getRun(companyId, runId);
        if (!canReverse(run.status as PayrollRunStatus)) {
            throw new Error(`PayrollRun: cannot reverse a ${run.status} run`);
        }

        const result = await prisma.$transaction(async (tx) => {
            const reversed = await tx.payrollRun.update({
                where: { id: runId },
                data: { status: 'REVERSED', reversedById: actorId, reversedAt: new Date() },
            });
            const replacement = await tx.payrollRun.create({
                data: {
                    companyId,
                    periodStart: run.periodStart,
                    periodEnd: run.periodEnd,
                    payFrequency: run.payFrequency,
                    currency: run.currency,
                    status: 'DRAFT',
                    createdById: actorId,
                    reversalOfRunId: runId,
                },
            });
            return { reversed, replacement };
        });

        await AuditService.log(actorId, 'PAYROLL_REVERSED', 'PAYROLL_RUN', runId, {
            companyId,
            reason: reason ?? null,
            replacementRunId: result.replacement.id,
        });

        return result;
    }
}
