/**
 * ISO-4217 currency support for Payroll Core.
 *
 * Country-agnostic: this module knows nothing about any country's statutory
 * rules — only how many minor units (decimal places) a currency has, so that
 * the Money value object can store every amount as an exact integer.
 *
 * We store ONLY the exponent exceptions; everything not listed defaults to 2
 * (the overwhelmingly common case: USD, EUR, GBP, INR, AED, SGD, AUD, ...).
 */

/** Currencies whose minor-unit exponent is NOT the default of 2. */
const MINOR_UNIT_EXCEPTIONS: Readonly<Record<string, number>> = {
    // Zero-decimal currencies
    BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
    PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
    // Three-decimal currencies
    BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
};

const DEFAULT_MINOR_UNITS = 2;
const ISO_4217_FORMAT = /^[A-Z]{3}$/;

/** Throws unless `code` is a syntactically valid ISO-4217 alpha code (3 uppercase letters). */
export function assertValidCurrency(code: string): void {
    if (typeof code !== 'string' || !ISO_4217_FORMAT.test(code)) {
        throw new Error(`Invalid ISO-4217 currency code: ${JSON.stringify(code)}`);
    }
}

/** Number of minor units (decimal places) for a currency. Defaults to 2. */
export function minorUnits(code: string): number {
    assertValidCurrency(code);
    return MINOR_UNIT_EXCEPTIONS[code] ?? DEFAULT_MINOR_UNITS;
}

/** 10 ** minorUnits(code), as a bigint scale factor (e.g. USD -> 100n, JPY -> 1n, KWD -> 1000n). */
export function minorUnitScale(code: string): bigint {
    return 10n ** BigInt(minorUnits(code));
}
