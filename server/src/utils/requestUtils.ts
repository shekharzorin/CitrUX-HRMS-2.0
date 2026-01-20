/**
 * Helper to safely extract a single string from req.query or req.headers.
 * Handles the case where Express returns string | string[] | undefined.
 * If an array is returned (e.g. ?id=1&id=2), it returns the first element.
 */
export const safeString = (value: any): string | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
        const first = value[0];
        return typeof first === 'string' ? first : undefined;
    }
    if (typeof value === 'string') return value;
    return undefined;
};

/**
 * Ensures the returned value is a string, or throws an error/returns default if needed.
 * Useful for required parameters.
 */
export const requireString = (value: any, fieldName: string = 'Field'): string => {
    const str = safeString(value);
    if (!str) {
        throw new Error(`${fieldName} is required`);
    }
    return str;
};
