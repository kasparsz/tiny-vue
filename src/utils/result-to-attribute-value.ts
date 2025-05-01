/**
 * Convert result to attribute value
 *
 * @param result - Result
 * @returns Attribute value
 */
export function resultToAttributeValue(result: any):string {
    if (Array.isArray(result)) {
        return result.map(resultToAttributeValue).join(' ');
    } else if (typeof result === 'object' && result) {
        // This is for classnames
        return Object.keys(result).map((key) => {
            return result[key] ? key : '';
        }).join(' ');
    } else {
        return String(result);
    }
}
