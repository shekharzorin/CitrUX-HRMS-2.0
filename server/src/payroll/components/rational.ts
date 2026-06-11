/**
 * Exact rational number (bigint numerator/denominator) used only to evaluate
 * FORMULA salary components without ever touching a float. Kept private to the
 * component resolver — payroll values are always Money; Rational is just the
 * intermediate for parsing "BASIC * 0.4 + HRA"-style expressions exactly.
 */
import { divRound, Money } from '../money';
import { minorUnitScale } from '../money/currency';

function gcd(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) {
        [a, b] = [b, a % b];
    }
    return a || 1n;
}

export class Rational {
    readonly n: bigint;
    readonly d: bigint;

    constructor(n: bigint, d: bigint = 1n) {
        if (d === 0n) throw new Error('Rational: zero denominator');
        if (d < 0n) {
            n = -n;
            d = -d;
        }
        const g = gcd(n, d);
        this.n = n / g;
        this.d = d / g;
    }

    add(o: Rational): Rational {
        return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
    }
    sub(o: Rational): Rational {
        return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
    }
    mul(o: Rational): Rational {
        return new Rational(this.n * o.n, this.d * o.d);
    }
    div(o: Rational): Rational {
        if (o.n === 0n) throw new Error('Rational: division by zero');
        return new Rational(this.n * o.d, this.d * o.n);
    }

    /** Parse a non-negative decimal literal like "0.4" or "1234.56". */
    static fromDecimal(s: string): Rational {
        const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
        if (!m) throw new Error(`Rational: invalid number ${JSON.stringify(s)}`);
        const intPart = m[1];
        const fracPart = m[2] ?? '';
        const n = BigInt(intPart + fracPart);
        const d = 10n ** BigInt(fracPart.length);
        return new Rational(n, d);
    }

    /** A Money amount expressed as major units (minor / scale). */
    static fromMoneyMajor(money: Money): Rational {
        return new Rational(money.amountMinor, minorUnitScale(money.currency));
    }

    /** Convert this rational (major units) to Money minor units, HALF_UP. */
    toMoney(currency: string): Money {
        const scale = minorUnitScale(currency);
        return Money.fromMinor(divRound(this.n * scale, this.d), currency);
    }
}
