/**
 * Payroll Core V2 rollout gate (shadow mode).
 *
 * Phase 1 ships V2 alongside the legacy payroll service WITHOUT routing
 * production traffic to it. The `PAYROLL_V2` feature flag (safe default: OFF)
 * is the switch a later cut-over phase flips per tenant. While OFF, the V2
 * services are still directly callable (e.g. for parallel-run reconciliation
 * against the legacy engine), but no production route depends on them.
 *
 * Resolution + caching are handled by the shared FeatureFlagService.
 */
import { featureFlags } from '../shared/feature-flags';

export function isPayrollV2Enabled(companyId?: string | null): Promise<boolean> {
    return featureFlags.isEnabled('PAYROLL_V2', companyId);
}
