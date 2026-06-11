/**
 * PayrollRun lifecycle state machine (pure, country-agnostic).
 *
 *   DRAFT ⇄ REVIEW → LOCKED → PUBLISHED
 *                       └──────────────→ REVERSED
 *                                  PUBLISHED → REVERSED
 *
 *  - DRAFT / REVIEW: recompute freely.
 *  - LOCKED:    immutable payslip data; forward only to PUBLISHED or REVERSED.
 *  - PUBLISHED: write-once; the only exit is REVERSED.
 *  - REVERSED:  terminal. A reversal spawns a NEW DRAFT run; it never edits the
 *               reversed run (audit integrity).
 *
 * This module has no DB/I/O so the transition rules are unit-testable on their
 * own. The service layer enforces tenant scope, immutability and audit around
 * these rules.
 */

export type PayrollRunStatus = 'DRAFT' | 'REVIEW' | 'LOCKED' | 'PUBLISHED' | 'REVERSED';

const TRANSITIONS: Readonly<Record<PayrollRunStatus, readonly PayrollRunStatus[]>> = {
    DRAFT: ['REVIEW'],
    REVIEW: ['DRAFT', 'LOCKED'],
    LOCKED: ['PUBLISHED', 'REVERSED'],
    PUBLISHED: ['REVERSED'],
    REVERSED: [],
};

export function canTransition(from: PayrollRunStatus, to: PayrollRunStatus): boolean {
    return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PayrollRunStatus, to: PayrollRunStatus): void {
    if (!canTransition(from, to)) {
        throw new Error(`PayrollRun: illegal transition ${from} → ${to}`);
    }
}

/** True while the run's computed payslip data may still change. */
export function canRecompute(status: PayrollRunStatus): boolean {
    return status === 'DRAFT' || status === 'REVIEW';
}

/** True once the run is immutable (no recompute / no payslip edits). */
export function isImmutable(status: PayrollRunStatus): boolean {
    return !canRecompute(status);
}

/** Reversal is only meaningful once the run has been committed (LOCKED/PUBLISHED). */
export function canReverse(status: PayrollRunStatus): boolean {
    return status === 'LOCKED' || status === 'PUBLISHED';
}
