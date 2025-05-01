/**
 * Convert result to string
 *
 * @param result - Result
 * @returns String
 */
export function resultToString(result: any) {
    if (result === null || result === undefined) {
        return '';
    } else {
        return '' + result;
    }
}