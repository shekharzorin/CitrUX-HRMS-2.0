/**
 * Compliance Engine contracts (Phase 2.1) — FROZEN, country-agnostic.
 *
 * These are the stable boundary between Payroll Core (which computes gross,
 * knows no statutory rules) and Compliance Packs (Phase 2.4+, which compute
 * country-specific statutory amounts). Core depends ONLY on these interfaces;
 * it never imports a concrete pack and never branches on countryCode.
 *
 * Terminology is deliberately generic: "statutory deduction", "employer
 * contribution", "tax". No country-specific term (PF/ESI/PT/TDS/NI/CPF/...)
 * appears here or anywhere in Core — those live exclusively inside packs.
 *
 * Phase 2.1 ships the TYPES only. No pack, no registry implementation, no
 * statutory math.
 */
import { Money } from '../money';

export type PayFrequency = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY';
export type CompensationType = 'SALARIED' | 'HOURLY' | 'DAILY';

export interface CompliancePeriod {
    start: Date;
    end: Date;
}

/** Pack-defined keyed jurisdiction codes, e.g. { work: "US-CA", residence: "US-NY" }. Core never interprets the keys or values. */
export interface JurisdictionCodes {
    [role: string]: string | null | undefined;
}

/** A resolved earning/deduction as seen by a pack (post-proration). */
export interface PayComponentView {
    code: string;
    name: string;
    amount: Money;
    taxable: boolean;
    /** Opaque pack-defined tags mapping the component to a statutory base. */
    classifications: string[];
}

export interface EmployeeContext {
    userId: string;
    taxResidencyCountry?: string | null;
    residencyStatus?: string | null;
    employmentType: string;
    compensationType: CompensationType;
    dateOfBirth?: Date | null;
    jurisdictionCodes?: JurisdictionCodes | null;
    /** Per-tax-year declarations (interpreted by the pack). */
    exemptions?: Record<string, unknown> | null;
    /** Country IDs keyed by pack-defined keys (PAN/SSN/NINO/...). */
    statutoryIdentifiers?: Record<string, unknown> | null;
}

export interface CompanyContext {
    companyId: string;
    countryCode: string;
    currency: string;
    fiscalYearStart: { month: number; day: number };
    taxYearStart: { month: number; day: number };
}

/** Year-to-date accumulators as of the period start (read-only input to a pack). */
export interface YtdSnapshot {
    taxYear: string;
    grossToDate?: Money;
    taxableToDate?: Money;
    byCode: Record<string, Money>;
}

/** ───────────────────────── ComplianceContext (input) ───────────────────────── */
export interface ComplianceContext {
    countryCode: string;
    currency: string;
    period: CompliancePeriod;
    payFrequency: PayFrequency;
    payDate: Date;
    employee: EmployeeContext;
    company: CompanyContext;
    earnings: PayComponentView[];
    contractualDeductions: PayComponentView[];
    grossPay: Money;
    taxableGross: Money;
    ytd?: YtdSnapshot | null;
    /** Resolved ComplianceRuleVersion parameters (slabs/rates/ceilings). Populated by the registry in Phase 2.2. */
    packParameters?: Record<string, unknown> | null;
}

/** ───────────────────────── ComplianceResult (output) ───────────────────────── */
export type StatutoryCategory = 'STATUTORY_EMPLOYEE' | 'STATUTORY_EMPLOYER';

export interface StatutoryLine {
    code: string;
    name: string;
    category: StatutoryCategory;
    amount: Money;
}

/** Per-line derivation trace — required for statutory auditability. */
export interface CalcTrace {
    code: string;
    explanation: string;
    inputs?: Record<string, unknown>;
}

export interface YtdDelta {
    code: string;
    amount: Money;
}

export interface ReportLine {
    code: string;
    values: Record<string, unknown>;
}

export interface ComplianceResult {
    countryCode: string;
    /** Reduce employee net pay. */
    employeeStatutory: StatutoryLine[];
    /** Employer cost only — NEVER part of net. */
    employerContributions: StatutoryLine[];
    reportingLines?: ReportLine[];
    ytdDeltas?: YtdDelta[];
    explain?: CalcTrace[];
}

/** ───────────────────────── Identifier & validation ───────────────────────── */
export interface IdentifierSpec {
    key: string; // pack-defined, e.g. "PAN"
    label: string;
    required: boolean;
    pattern?: string; // regex source for client/server validation
    description?: string;
}

export type ValidationSeverity = 'ERROR' | 'WARNING';

export interface ValidationIssue {
    field: string;
    severity: ValidationSeverity;
    message: string;
}

/** ───────────────────────── Reporting artifact ───────────────────────── */
export type ReportFormat = 'CSV' | 'XML' | 'JSON' | 'PDF' | 'TXT';

export interface ReportInput {
    countryCode: string;
    period: CompliancePeriod;
    payslips: unknown[]; // concrete shape finalized in Phase 2.5
}

export interface ReportArtifact {
    type: string; // pack-defined report identifier
    countryCode: string;
    format: ReportFormat;
    filename: string;
    payload: string; // generated content; transmission to government is a separate later concern
    meta?: Record<string, unknown>;
}

/** ───────────────────────── The pack contract (Strategy) ───────────────────────── */
export interface CompliancePack {
    readonly countryCode: string;
    readonly version: string;
    asOfDatePolicy(): 'PAY_DATE' | 'PERIOD_END';
    calculate(ctx: ComplianceContext): ComplianceResult;
    validate(employee: EmployeeContext, company: CompanyContext): ValidationIssue[];
    requiredIdentifiers(): IdentifierSpec[];
    report?(input: ReportInput): ReportArtifact[];
}

/**
 * Resolver PORT only — Phase 2.1 defines the interface the assembler depends on.
 * The concrete CompliancePackRegistry (effective-date resolution, rule versions,
 * caching) is Phase 2.2 and is intentionally NOT implemented here.
 */
export interface ResolvedPack {
    pack: CompliancePack;
    ruleVersion?: { version: string; parameters?: Record<string, unknown> | null };
}

export interface CompliancePackResolver {
    resolve(countryCode: string, asOf: Date): ResolvedPack;
}
