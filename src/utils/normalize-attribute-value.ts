/**
 * Normalize value for output as attribute
 *
 * @param value - Value to normalize
 * @returns Normalized value
 */
export function normalizeAttributeValue(value: any) {
    if (value === '') {
        return true;
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
        return parseFloat(value);
    } else {
        return value;
    }
}
