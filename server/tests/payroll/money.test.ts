import { Money, Rounding, divRound } from '../../src/payroll/money';

describe('Payroll Core — Money value object', () => {
    describe('construction', () => {
        it('builds from minor units', () => {
            const m = Money.fromMinor(123456n, 'USD');
            expect(m.amountMinor).toBe(123456n);
            expect(m.currency).toBe('USD');
            expect(m.format()).toBe('1234.56');
        });

        it('builds from a major-unit string with exact precision', () => {
            expect(Money.fromMajor('1234.56', 'USD').amountMinor).toBe(123456n);
            expect(Money.fromMajor('1234', 'USD').amountMinor).toBe(123400n);
            expect(Money.fromMajor('-0.07', 'USD').amountMinor).toBe(-7n);
        });

        it('respects currency-specific minor units (JPY=0, KWD=3)', () => {
            expect(Money.fromMajor('1000', 'JPY').amountMinor).toBe(1000n);
            expect(Money.fromMajor('1000', 'JPY').format()).toBe('1000');
            expect(Money.fromMajor('1.234', 'KWD').amountMinor).toBe(1234n);
            expect(Money.fromMajor('1.234', 'KWD').format()).toBe('1.234');
        });

        it('normalizes currency case', () => {
            expect(Money.fromMinor(1n, 'inr').currency).toBe('INR');
        });

        it('rejects invalid currency codes', () => {
            expect(() => Money.fromMinor(1n, 'US')).toThrow(/Invalid ISO-4217/);
            expect(() => Money.fromMinor(1n, 'US$')).toThrow(/Invalid ISO-4217/);
        });

        it('rejects over-precise major input rather than silently truncating', () => {
            expect(() => Money.fromMajor('1.234', 'USD')).toThrow(/fractional digits/);
            expect(() => Money.fromMajor('1.5', 'JPY')).toThrow(/fractional digits/);
        });
    });

    describe('arithmetic', () => {
        it('adds and subtracts same-currency amounts', () => {
            const a = Money.fromMajor('100.00', 'USD');
            const b = Money.fromMajor('33.33', 'USD');
            expect(a.add(b).format()).toBe('133.33');
            expect(a.subtract(b).format()).toBe('66.67');
            expect(a.negate().format()).toBe('-100.00');
        });

        it('throws on cross-currency operations', () => {
            const usd = Money.fromMajor('1', 'USD');
            const inr = Money.fromMajor('1', 'INR');
            expect(() => usd.add(inr)).toThrow(/currency mismatch/);
            expect(() => usd.subtract(inr)).toThrow(/currency mismatch/);
            expect(() => usd.compare(inr)).toThrow(/currency mismatch/);
        });

        it('multiplies by an integer factor exactly', () => {
            expect(Money.fromMajor('12.34', 'USD').mulInt(3).format()).toBe('37.02');
        });

        it('applies a ratio with HALF_UP rounding (proration)', () => {
            // 50,000.00 prorated to 21.5 of 22 working days -> use half-units to stay integer
            const salary = Money.fromMajor('50000.00', 'USD');
            const prorated = salary.mulRatio(43n, 44n); // 21.5/22 == 43/44
            expect(prorated.format()).toBe('48863.64'); // 50000 * 43/44 = 48863.6363.. -> HALF_UP
        });

        it('applies a percentage in basis points', () => {
            // 40% of 50,000.00
            expect(Money.fromMajor('50000.00', 'USD').percentageBps(4000n).format()).toBe('20000.00');
            // 12.5% of 1,000.00 -> 125.00
            expect(Money.fromMajor('1000.00', 'USD').percentageBps(1250n).format()).toBe('125.00');
        });
    });

    describe('divRound', () => {
        it('rounds half up (away from zero) by default', () => {
            expect(divRound(5n, 2n)).toBe(3n);
            expect(divRound(-5n, 2n)).toBe(-3n);
            expect(divRound(4n, 2n)).toBe(2n);
        });
        it('supports HALF_EVEN', () => {
            expect(divRound(5n, 2n, Rounding.HALF_EVEN)).toBe(2n); // 2.5 -> 2 (even)
            expect(divRound(7n, 2n, Rounding.HALF_EVEN)).toBe(4n); // 3.5 -> 4 (even)
        });
        it('supports DOWN (truncate toward zero)', () => {
            expect(divRound(9n, 2n, Rounding.DOWN)).toBe(4n);
            expect(divRound(-9n, 2n, Rounding.DOWN)).toBe(-4n);
        });
        it('throws on divide by zero', () => {
            expect(() => divRound(1n, 0n)).toThrow(/division by zero/);
        });
    });

    describe('allocate', () => {
        it('splits with no remainder loss (largest-remainder)', () => {
            const parts = Money.fromMajor('100.00', 'USD').allocate([1, 1, 1]);
            expect(parts.map((p) => p.format())).toEqual(['33.34', '33.33', '33.33']);
            const total = Money.sum(parts);
            expect(total.format()).toBe('100.00');
        });

        it('splits by weights and re-sums exactly', () => {
            const parts = Money.fromMajor('1000.00', 'USD').allocate([7, 2, 1]);
            const total = Money.sum(parts);
            expect(total.format()).toBe('1000.00');
            expect(parts[0].format()).toBe('700.00');
        });

        it('handles negative amounts without losing a unit', () => {
            const parts = Money.fromMajor('-100.00', 'USD').allocate([1, 1, 1]);
            expect(Money.sum(parts).format()).toBe('-100.00');
        });

        it('allocateEvenly is exact', () => {
            const parts = Money.fromMinor(100n, 'USD').allocateEvenly(3);
            expect(parts.map((p) => p.amountMinor)).toEqual([34n, 33n, 33n]);
            expect(Money.sum(parts).amountMinor).toBe(100n);
        });

        it('rejects empty / non-positive weights', () => {
            expect(() => Money.fromMinor(1n, 'USD').allocate([])).toThrow();
            expect(() => Money.fromMinor(1n, 'USD').allocate([0, 0])).toThrow(/positive/);
            expect(() => Money.fromMinor(1n, 'USD').allocate([-1, 2])).toThrow(/non-negative/);
        });
    });

    describe('comparison & helpers', () => {
        it('compares and reports sign', () => {
            const a = Money.fromMinor(100n, 'USD');
            const b = Money.fromMinor(200n, 'USD');
            expect(a.lt(b)).toBe(true);
            expect(b.gt(a)).toBe(true);
            expect(a.equals(Money.fromMinor(100n, 'USD'))).toBe(true);
            expect(Money.zero('USD').isZero()).toBe(true);
            expect(a.negate().isNegative()).toBe(true);
        });

        it('sums an empty list when given a currency', () => {
            expect(Money.sum([], 'USD').isZero()).toBe(true);
            expect(() => Money.sum([])).toThrow(/needs a currency/);
        });

        it('serializes JSON-safely', () => {
            expect(Money.fromMinor(123456n, 'USD').toJSON()).toEqual({
                amountMinor: '123456',
                currency: 'USD',
            });
            expect(Money.fromMinor(123456n, 'USD').toString()).toBe('1234.56 USD');
        });
    });
});
