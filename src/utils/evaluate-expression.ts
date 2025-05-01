/**
 * Evaluate expression
 *
 * @param expression - Expression
 * @param bindings - Bindings
 * @returns Function
 */
export function evaluateExpression(expression: string, bindings: any) {
    return new Function(`with(this){return ${expression}}`).bind(bindings);
}
