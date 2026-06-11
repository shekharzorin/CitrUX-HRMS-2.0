/**
 * Salary component resolver — turns a component-based salary structure into
 * exact Money amounts. Country-agnostic and statutory-free: this only computes
 * contractual earnings/deductions (FIXED / PERCENT_OF_BASE / FORMULA). PF/ESI/
 * PT/TDS and any government rule are NOT here — those are Compliance-Pack output.
 *
 * Structurally fixes the legacy "DA dropped from gross" bug: gross is the sum of
 * every EARNING component, so no component can be silently omitted.
 */
import { Money } from '../money';
import { Rational } from './rational';
import { evaluateFormula } from './formula';

export type ComponentKind = 'EARNING' | 'DEDUCTION';
export type CalcMethod = 'FIXED' | 'PERCENT_OF_BASE' | 'FORMULA';

export interface ComponentInput {
    code: string;
    name: string;
    kind: ComponentKind;
    calcMethod: CalcMethod;
    amountMinor?: bigint | number | null;
    currency?: string | null;
    rateBps?: number | null;
    baseComponentCode?: string | null;
    formula?: string | null;
    taxable?: boolean;
    prorate?: boolean;
    sortOrder?: number;
}

export interface ResolvedComponent {
    code: string;
    name: string;
    kind: ComponentKind;
    taxable: boolean;
    prorate: boolean;
    sortOrder: number;
    amount: Money;
}

/**
 * Resolve all components to Money in `currency`. Dependencies (PERCENT_OF_BASE
 * base, FORMULA references) are resolved recursively with cycle detection.
 */
export function resolveComponents(components: ComponentInput[], currency: string): ResolvedComponent[] {
    const byCode = new Map<string, ComponentInput>();
    for (const c of components) {
        if (byCode.has(c.code)) throw new Error(`Component resolver: duplicate code ${c.code}`);
        byCode.set(c.code, c);
    }

    const memo = new Map<string, Money>();
    const visiting = new Set<string>();

    function resolve(code: string): Money {
        const cached = memo.get(code);
        if (cached) return cached;
        if (visiting.has(code)) {
            throw new Error(`Component resolver: cyclic dependency at ${code}`);
        }
        const comp = byCode.get(code);
        if (!comp) throw new Error(`Component resolver: unknown component reference ${code}`);

        visiting.add(code);
        let amount: Money;

        switch (comp.calcMethod) {
            case 'FIXED': {
                if (comp.currency && comp.currency.toUpperCase() !== currency) {
                    throw new Error(
                        `Component ${code}: currency ${comp.currency} != structure currency ${currency}`
                    );
                }
                amount = Money.fromMinor(BigInt(comp.amountMinor ?? 0), currency);
                break;
            }
            case 'PERCENT_OF_BASE': {
                if (!comp.baseComponentCode) {
                    throw new Error(`Component ${code}: PERCENT_OF_BASE needs baseComponentCode`);
                }
                const base = resolve(comp.baseComponentCode);
                amount = base.percentageBps(BigInt(comp.rateBps ?? 0));
                break;
            }
            case 'FORMULA': {
                if (!comp.formula) throw new Error(`Component ${code}: FORMULA needs a formula`);
                const rational = evaluateFormula(comp.formula, (ref) =>
                    Rational.fromMoneyMajor(resolve(ref))
                );
                amount = rational.toMoney(currency);
                break;
            }
            default:
                throw new Error(`Component ${code}: unknown calcMethod ${comp.calcMethod}`);
        }

        visiting.delete(code);
        memo.set(code, amount);
        return amount;
    }

    return components
        .map((c, i) => ({
            code: c.code,
            name: c.name,
            kind: c.kind,
            taxable: c.taxable ?? true,
            prorate: c.prorate ?? true,
            sortOrder: c.sortOrder ?? i,
            amount: resolve(c.code),
        }))
        .sort((a, b) => (a.sortOrder === b.sortOrder ? 0 : a.sortOrder - b.sortOrder));
}
