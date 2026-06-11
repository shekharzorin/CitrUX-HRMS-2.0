/**
 * Sandboxed formula evaluator for FORMULA salary components.
 *
 * Grammar (recursive descent, exact rational arithmetic — no eval, no float):
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := number | identifier | '(' expr ')' | '-' factor
 *
 * Identifiers must be known sibling component codes; anything else throws.
 * This is deliberately tiny and allow-listed: no function calls, no property
 * access, no arbitrary identifiers — so a salary formula cannot execute code.
 */
import { Rational } from './rational';

type Token =
    | { t: 'num'; v: string }
    | { t: 'id'; v: string }
    | { t: 'op'; v: '+' | '-' | '*' | '/' }
    | { t: 'lp' }
    | { t: 'rp' };

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
            i++;
            continue;
        }
        if (c === '(') { tokens.push({ t: 'lp' }); i++; continue; }
        if (c === ')') { tokens.push({ t: 'rp' }); i++; continue; }
        if (c === '+' || c === '-' || c === '*' || c === '/') {
            tokens.push({ t: 'op', v: c });
            i++;
            continue;
        }
        if (c >= '0' && c <= '9') {
            let j = i + 1;
            while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
            tokens.push({ t: 'num', v: src.slice(i, j) });
            i = j;
            continue;
        }
        if (/[A-Za-z_]/.test(c)) {
            let j = i + 1;
            while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
            tokens.push({ t: 'id', v: src.slice(i, j) });
            i = j;
            continue;
        }
        throw new Error(`Formula: unexpected character ${JSON.stringify(c)} in ${JSON.stringify(src)}`);
    }
    return tokens;
}

/**
 * Evaluate `formula` to a Rational. `resolveRef` returns the major-unit value of
 * a referenced sibling component (and is responsible for cycle detection).
 */
export function evaluateFormula(formula: string, resolveRef: (code: string) => Rational): Rational {
    const tokens = tokenize(formula);
    let pos = 0;

    const peek = (): Token | undefined => tokens[pos];
    const next = (): Token => {
        const t = tokens[pos++];
        if (!t) throw new Error(`Formula: unexpected end of expression in ${JSON.stringify(formula)}`);
        return t;
    };

    function parseExpr(): Rational {
        let left = parseTerm();
        for (let t = peek(); t && t.t === 'op' && (t.v === '+' || t.v === '-'); t = peek()) {
            next();
            const right = parseTerm();
            left = t.v === '+' ? left.add(right) : left.sub(right);
        }
        return left;
    }

    function parseTerm(): Rational {
        let left = parseFactor();
        for (let t = peek(); t && t.t === 'op' && (t.v === '*' || t.v === '/'); t = peek()) {
            next();
            const right = parseFactor();
            left = t.v === '*' ? left.mul(right) : left.div(right);
        }
        return left;
    }

    function parseFactor(): Rational {
        const t = next();
        if (t.t === 'op' && t.v === '-') return parseFactor().mul(new Rational(-1n));
        if (t.t === 'num') return Rational.fromDecimal(t.v);
        if (t.t === 'id') return resolveRef(t.v);
        if (t.t === 'lp') {
            const inner = parseExpr();
            const close = next();
            if (close.t !== 'rp') throw new Error(`Formula: expected ')' in ${JSON.stringify(formula)}`);
            return inner;
        }
        throw new Error(`Formula: unexpected token in ${JSON.stringify(formula)}`);
    }

    const result = parseExpr();
    if (pos !== tokens.length) {
        throw new Error(`Formula: trailing tokens in ${JSON.stringify(formula)}`);
    }
    return result;
}
