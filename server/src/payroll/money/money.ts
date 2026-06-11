/**
 * Money — a currency-aware, exact monetary value for Payroll Core.
 *
 * Design rules (Phase 1, country-agnostic):
 *  - Amounts are stored as INTEGER minor units in a `bigint`. There is no
 *    floating-point arithmetic anywhere in this class, so rounding drift is
 *    structurally impossible.
 *  - Every Money carries its ISO-4217 currency. Cross-currency operations
 *    throw rather than silently coercing.
 *  - All proportional math (percentages, proration) goes through `mulRatio`
 *    with an explicit rounding mode, and splitting goes through `allocate`,
 *    which distributes the rounding remainder so the parts re-sum EXACTLY to
 *    the whole.
 *
 * Persistence: store `amountMinor` (BigInt column) + `currency` (String). This
 * class is the only place payroll arithmetic should happen.
 */
import { assertValidCurrency, minorUnits, minorUnitScale } from './currency';

export enum Rounding {
    /** Round half away from zero (standard payroll default). */
    HALF_UP = 'HALF_UP',
    /** Round half to even (banker's rounding). */
    HALF_EVEN = 'HALF_EVEN',
    /** Truncate toward zero. */
    DOWN = 'DOWN',
    /** Round away from zero. */
    UP = 'UP',
}

function abs(n: bigint): bigint {
    return n < 0n ? -n : n;
}

/**
 * Divide `numerator / denominator` to an integer with the given rounding mode.
 * Pure bigint — no float. Handles negative numerators/denominators correctly.
 */
export function divRound(numerator: bigint, denominator: bigint, mode: Rounding = Rounding.HALF_UP): bigint {
    if (denominator === 0n) throw new Error('Money: division by zero');

    const q = numerator / denominator; // bigint division truncates toward zero
    const r = numerator % denominator; // remainder, sign follows numerator
    if (r === 0n) return q;

    const sign = (numerator < 0n) !== (denominator < 0n) ? -1n : 1n;
    const twiceRem = 2n * abs(r);
    const absDen = abs(denominator);

    switch (mode) {
        case Rounding.DOWN:
            return q;
        case Rounding.UP:
            return q + sign;
        case Rounding.HALF_UP:
            return twiceRem >= absDen ? q + sign : q;
        case Rounding.HALF_EVEN:
            if (twiceRem > absDen) return q + sign;
            if (twiceRem < absDen) return q;
            // exactly half — round to even
            return q % 2n === 0n ? q : q + sign;
        default:
            throw new Error(`Money: unknown rounding mode ${mode}`);
    }
}

export class Money {
    /** Integer amount in the currency's minor units (e.g. cents). */
    readonly amountMinor: bigint;
    /** ISO-4217 alpha code, normalized uppercase. */
    readonly currency: string;

    private constructor(amountMinor: bigint, currency: string) {
        this.amountMinor = amountMinor;
        this.currency = currency;
    }

    // ── Construction ────────────────────────────────────────────────────────

    /** From an integer count of minor units (cents). */
    static fromMinor(amountMinor: bigint | number, currency: string): Money {
        const code = currency.toUpperCase();
        assertValidCurrency(code);
        const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(Math.trunc(amountMinor));
        return new Money(minor, code);
    }

    /**
     * From a major-unit decimal STRING (e.g. "1234.56" USD). Number input is
     * accepted for convenience but stringified first; pass a string when exact
     * input matters, since JS number literals can't represent all decimals.
     *
     * Throws if the value carries more fractional digits than the currency allows
     * (no silent truncation of money).
     */
    static fromMajor(major: string | number, currency: string): Money {
        const code = currency.toUpperCase();
        assertValidCurrency(code);

        const raw = typeof major === 'number' ? major.toString() : major.trim();
        const m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(raw);
        if (!m) throw new Error(`Money: invalid major amount ${JSON.stringify(major)}`);

        const negative = m[1] === '-';
        const intPart = m[2];
        const fracPart = m[3] ?? '';
        const exponent = minorUnits(code);

        if (fracPart.length > exponent) {
            throw new Error(
                `Money: ${raw} has more fractional digits than ${code} allows (${exponent})`
            );
        }

        const paddedFrac = fracPart.padEnd(exponent, '0');
        const combined = `${intPart}${paddedFrac}`;
        let minor = BigInt(combined);
        if (negative) minor = -minor;
        return new Money(minor, code);
    }

    /** Zero in the given currency. */
    static zero(currency: string): Money {
        return Money.fromMinor(0n, currency);
    }

    // ── Guards ──────────────────────────────────────────────────────────────

    private assertSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
            throw new Error(
                `Money: currency mismatch (${this.currency} vs ${other.currency})`
            );
        }
    }

    // ── Arithmetic ──────────────────────────────────────────────────────────

    add(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money(this.amountMinor + other.amountMinor, this.currency);
    }

    subtract(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money(this.amountMinor - other.amountMinor, this.currency);
    }

    negate(): Money {
        return new Money(-this.amountMinor, this.currency);
    }

    /** Multiply by an exact integer factor. */
    mulInt(factor: bigint | number): Money {
        const f = typeof factor === 'bigint' ? factor : BigInt(Math.trunc(factor));
        return new Money(this.amountMinor * f, this.currency);
    }

    /**
     * Multiply by the rational numerator/denominator with explicit rounding.
     * This is how percentages and proration are applied:
     *   salary.mulRatio(workedUnits, totalUnits)
     *   base.mulRatio(rateBasisPoints, 10_000n)
     */
    mulRatio(
        numerator: bigint | number,
        denominator: bigint | number,
        mode: Rounding = Rounding.HALF_UP
    ): Money {
        const num = typeof numerator === 'bigint' ? numerator : BigInt(Math.trunc(numerator));
        const den = typeof denominator === 'bigint' ? denominator : BigInt(Math.trunc(denominator));
        return new Money(divRound(this.amountMinor * num, den, mode), this.currency);
    }

    /**
     * Apply a percentage given in basis points (1% = 100 bps), rounded HALF_UP.
     * Pure integer math; no float percentages.
     */
    percentageBps(basisPoints: bigint | number, mode: Rounding = Rounding.HALF_UP): Money {
        return this.mulRatio(basisPoints, 10_000n, mode);
    }

    // ── Allocation (exact split) ────────────────────────────────────────────

    /**
     * Split this amount across `weights`, distributing the rounding remainder
     * via the largest-remainder method so the parts re-sum to EXACTLY this
     * amount. Weights must be non-negative and sum to a positive value.
     */
    allocate(weights: Array<bigint | number>): Money[] {
        if (weights.length === 0) throw new Error('Money: allocate requires at least one weight');

        const w = weights.map((x) => (typeof x === 'bigint' ? x : BigInt(Math.trunc(x))));
        if (w.some((x) => x < 0n)) throw new Error('Money: allocate weights must be non-negative');

        const total = w.reduce((a, b) => a + b, 0n);
        if (total <= 0n) throw new Error('Money: allocate weights must sum to a positive value');

        const shares: bigint[] = [];
        const remainders: bigint[] = [];
        let distributed = 0n;
        for (const weight of w) {
            const product = this.amountMinor * weight;
            const share = product / total; // toward zero
            shares.push(share);
            remainders.push(product % total); // sign follows amountMinor
            distributed += share;
        }

        // Hand out the leftover minor units one at a time to the largest |remainder|.
        let leftover = this.amountMinor - distributed; // sign matches amountMinor
        const step = leftover < 0n ? -1n : 1n;
        const order = remainders
            .map((rem, idx) => ({ rem: abs(rem), idx }))
            .sort((a, b) => (b.rem === a.rem ? a.idx - b.idx : b.rem > a.rem ? 1 : -1));

        let k = 0;
        while (leftover !== 0n) {
            shares[order[k % order.length].idx] += step;
            leftover -= step;
            k++;
        }

        return shares.map((s) => new Money(s, this.currency));
    }

    /** Split into `n` equal parts (remainder distributed deterministically). */
    allocateEvenly(n: number): Money[] {
        if (!Number.isInteger(n) || n <= 0) throw new Error('Money: allocateEvenly needs a positive integer');
        return this.allocate(new Array(n).fill(1n));
    }

    // ── Comparison ──────────────────────────────────────────────────────────

    compare(other: Money): -1 | 0 | 1 {
        this.assertSameCurrency(other);
        if (this.amountMinor < other.amountMinor) return -1;
        if (this.amountMinor > other.amountMinor) return 1;
        return 0;
    }

    equals(other: Money): boolean {
        return this.currency === other.currency && this.amountMinor === other.amountMinor;
    }

    gt(other: Money): boolean { return this.compare(other) > 0; }
    gte(other: Money): boolean { return this.compare(other) >= 0; }
    lt(other: Money): boolean { return this.compare(other) < 0; }
    lte(other: Money): boolean { return this.compare(other) <= 0; }

    isZero(): boolean { return this.amountMinor === 0n; }
    isNegative(): boolean { return this.amountMinor < 0n; }
    isPositive(): boolean { return this.amountMinor > 0n; }

    // ── Aggregation helpers ─────────────────────────────────────────────────

    /** Sum a list of same-currency Money. Requires `currency` if list may be empty. */
    static sum(items: Money[], currency?: string): Money {
        if (items.length === 0) {
            if (!currency) throw new Error('Money: sum of empty list needs a currency');
            return Money.zero(currency);
        }
        return items.reduce((acc, m) => acc.add(m));
    }

    // ── Serialization ───────────────────────────────────────────────────────

    /** Major-unit string with the currency's fixed number of decimals (e.g. "1234.56"). */
    format(): string {
        const exponent = minorUnits(this.currency);
        if (exponent === 0) return this.amountMinor.toString();

        const scale = minorUnitScale(this.currency);
        const negative = this.amountMinor < 0n;
        const magnitude = negative ? -this.amountMinor : this.amountMinor;
        const intPart = magnitude / scale;
        const fracPart = (magnitude % scale).toString().padStart(exponent, '0');
        return `${negative ? '-' : ''}${intPart.toString()}.${fracPart}`;
    }

    toString(): string {
        return `${this.format()} ${this.currency}`;
    }

    /** Plain object for persistence / JSON (bigint -> string to stay JSON-safe). */
    toJSON(): { amountMinor: string; currency: string } {
        return { amountMinor: this.amountMinor.toString(), currency: this.currency };
    }
}
