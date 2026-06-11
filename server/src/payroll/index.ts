/**
 * Payroll Core (Phase 1) — public surface.
 *
 * Country-agnostic gross payroll: Money, component-based salary structures,
 * working-day calendar + proration, the gross calculator, the PayrollRun
 * lifecycle, and tenant-scoped services. NO statutory logic lives here — that is
 * the job of Compliance Packs (Phase 2), which consume the ComplianceContext
 * this module emits.
 */
export { Money, Rounding } from './money';
export { WorkingDayCalendar } from './calendar/working-day-calendar';
export {
    getProrationStrategy,
    CalendarDayProration,
    WorkingDayProration,
    ProrationBasis,
    Period,
} from './proration/proration';
export { resolveComponents, ComponentInput, ResolvedComponent } from './components/resolver';
export { computeGross, CalcInput, PayrollComputation, AttendanceSummary } from './calc/calculator';
export { PayrollCalcService, reduceAttendance } from './calc/payroll-calc.service';
export {
    PayrollRunStatus,
    canTransition,
    assertTransition,
    canRecompute,
    isImmutable,
    canReverse,
} from './run/lifecycle';
export { PayrollRunService, assertRunTenant, PayrollTenantError } from './run/payroll-run.service';
export { CompanyPayrollSettingsService } from './profile/company-payroll-settings.service';
export { EmployeePayrollProfileService } from './profile/employee-payroll-profile.service';
export { isPayrollV2Enabled } from './feature';
