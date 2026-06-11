/**
 * ComplianceAssembler (Phase 2.1) — the orchestration layer between Payroll Core
 * and Compliance Packs. PURE (no DB, no I/O) and country-agnostic.
 *
 * Responsibilities (this phase implements all five; it does NOT implement the
 * registry, any pack, any statutory math, or YTD persistence):
 *   1. Build a ComplianceContext from Payroll Core outputs (+ profile/company).
 *   2. Invoke the CompliancePackResolver (a port — concrete registry is 2.2).
 *   3. Merge the ComplianceResult's statutory lines into the payslip lines.
 *   4. Recompute FINAL net pay = gross − contractual − employee statutory
 *      (employer contributions are cost only and never reduce net).
 *   5. Prepare YTD delta structures and return them WITHOUT persisting.
 *
 * The assembler depends only on the frozen contracts, so it is fully testable
 * with an injected fake pack — exercising merge/net/context logic with zero
 * statutory or country-specific code.
 */
import { Money } from '../money';
import { PayrollComputation } from '../calc/calculator';
import {
    CompliancePackResolver,
    ComplianceContext,
    ComplianceResult,
    EmployeeContext,
    CompanyContext,
    PayComponentView,
    YtdSnapshot,
    YtdDelta,
    StatutoryLine,
} from './contracts';

export interface AssemblerProfileInput {
    userId: string;
    taxResidencyCountry?: string | null;
    residencyStatus?: string | null;
    employmentType: string;
    compensationType: 'SALARIED' | 'HOURLY' | 'DAILY';
    dateOfBirth?: Date | null;
    jurisdictionCodes?: Record<string, string | null | undefined> | null;
    exemptions?: Record<string, unknown> | null;
    statutoryIdentifiers?: Record<string, unknown> | null;
}

export interface AssemblerCompanyInput {
    companyId: string;
    countryCode: string;
    currency: string;
    fiscalYearStart: { month: number; day: number };
    taxYearStart: { month: number; day: number };
}

export interface AssembleInput {
    core: PayrollComputation;
    profile: AssemblerProfileInput;
    company: AssemblerCompanyInput;
    payDate: Date;
    ytd?: YtdSnapshot | null;
    /** code -> opaque classification tags (loaded from SalaryComponentV2 by the caller in 2.2). */
    classificationsByCode?: Record<string, string[]>;
}

export type AssembledCategory =
    | 'EARNING'
    | 'DEDUCTION'
    | 'STATUTORY_EMPLOYEE'
    | 'STATUTORY_EMPLOYER'
    | 'ADJUSTMENT'
    | 'ARREAR';

export interface AssembledLine {
    componentCode: string;
    name: string;
    category: AssembledCategory;
    amount: Money;
    taxable: boolean;
    origin: string; // CORE | PACK:<countryCode>
    sortOrder: number;
}

export interface MergeOutput {
    lines: AssembledLine[];
    gross: Money;
    contractualDeductionTotal: Money;
    employeeStatutoryTotal: Money;
    totalEmployeeDeductions: Money;
    net: Money; // FINAL net, after statutory
    employerCostTotal: Money;
}

export interface AssembledPayroll extends MergeOutput {
    context: ComplianceContext;
    result: ComplianceResult;
    ytdDeltas: YtdDelta[];
}

export class ComplianceAssembler {
    /** Build the frozen ComplianceContext from Core outputs + profile/company. */
    buildContext(input: AssembleInput): ComplianceContext {
        const { core, profile, company, payDate, ytd, classificationsByCode } = input;
        const currency = core.currency;

        const toView = (l: { componentCode: string; name: string; amount: Money; taxable: boolean }): PayComponentView => ({
            code: l.componentCode,
            name: l.name,
            amount: l.amount,
            taxable: l.taxable,
            classifications: classificationsByCode?.[l.componentCode] ?? [],
        });

        const earnings = core.lines.filter((l) => l.category === 'EARNING').map(toView);
        const contractualDeductions = core.lines.filter((l) => l.category === 'DEDUCTION').map(toView);

        const taxableGross = Money.sum(
            earnings.filter((e) => e.taxable).map((e) => e.amount),
            currency
        );

        const employee: EmployeeContext = {
            userId: profile.userId,
            taxResidencyCountry: profile.taxResidencyCountry ?? null,
            residencyStatus: profile.residencyStatus ?? null,
            employmentType: profile.employmentType,
            compensationType: profile.compensationType,
            dateOfBirth: profile.dateOfBirth ?? null,
            jurisdictionCodes: profile.jurisdictionCodes ?? null,
            exemptions: profile.exemptions ?? null,
            statutoryIdentifiers: profile.statutoryIdentifiers ?? null,
        };

        const companyCtx: CompanyContext = {
            companyId: company.companyId,
            countryCode: company.countryCode,
            currency: company.currency,
            fiscalYearStart: company.fiscalYearStart,
            taxYearStart: company.taxYearStart,
        };

        return {
            countryCode: company.countryCode,
            currency,
            period: core.period,
            payFrequency: core.complianceContext.payFrequency,
            payDate,
            employee,
            company: companyCtx,
            earnings,
            contractualDeductions,
            grossPay: core.gross,
            taxableGross,
            ytd: ytd ?? null,
        };
    }

    /** Merge Core lines with pack statutory lines and recompute FINAL net. */
    merge(core: PayrollComputation, result: ComplianceResult): MergeOutput {
        const currency = core.currency;
        const lines: AssembledLine[] = [];
        let sort = 0;

        for (const l of core.lines) {
            lines.push({
                componentCode: l.componentCode,
                name: l.name,
                category: l.category,
                amount: l.amount,
                taxable: l.taxable,
                origin: 'CORE',
                sortOrder: sort++,
            });
        }

        const packOrigin = `PACK:${result.countryCode}`;
        const pushStatutory = (sl: StatutoryLine) => {
            lines.push({
                componentCode: sl.code,
                name: sl.name,
                category: sl.category,
                amount: sl.amount, // Money.add below enforces currency match
                taxable: false,
                origin: packOrigin,
                sortOrder: sort++,
            });
        };
        result.employeeStatutory.forEach(pushStatutory);
        result.employerContributions.forEach(pushStatutory);

        const gross = core.gross;
        const contractualDeductionTotal = core.totalDeductions;
        const employeeStatutoryTotal = Money.sum(
            result.employeeStatutory.map((s) => s.amount),
            currency
        );
        const employerCostTotal = Money.sum(
            result.employerContributions.map((s) => s.amount),
            currency
        );
        const totalEmployeeDeductions = contractualDeductionTotal.add(employeeStatutoryTotal);
        const net = gross.subtract(totalEmployeeDeductions);

        return {
            lines,
            gross,
            contractualDeductionTotal,
            employeeStatutoryTotal,
            totalEmployeeDeductions,
            net,
            employerCostTotal,
        };
    }

    /** Build YTD delta structures (NOT persisted — Phase 2.3 owns persistence). */
    prepareYtdDeltas(context: ComplianceContext, result: ComplianceResult): YtdDelta[] {
        const deltas: YtdDelta[] = [
            { code: 'GROSS', amount: context.grossPay },
            { code: 'TAXABLE_GROSS', amount: context.taxableGross },
        ];
        for (const s of result.employeeStatutory) deltas.push({ code: s.code, amount: s.amount });
        for (const s of result.employerContributions) deltas.push({ code: s.code, amount: s.amount });
        if (result.ytdDeltas) deltas.push(...result.ytdDeltas);
        return deltas;
    }

    /** Full orchestration: context → resolve pack → calculate → merge → YTD deltas. Persists nothing. */
    assemble(input: AssembleInput, resolver: CompliancePackResolver): AssembledPayroll {
        const context = this.buildContext(input);
        const { pack, ruleVersion } = resolver.resolve(input.company.countryCode, input.payDate);
        if (ruleVersion?.parameters !== undefined) {
            context.packParameters = ruleVersion.parameters;
        }
        const result = pack.calculate(context);
        const merged = this.merge(input.core, result);
        const ytdDeltas = this.prepareYtdDeltas(context, result);
        return { context, result, ...merged, ytdDeltas };
    }
}
