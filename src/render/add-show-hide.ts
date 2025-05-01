import { effect } from "../signal-reactive";
import { evaluateExpression } from "../utils/evaluate-expression";

/**
 * Add show/hide
 *
 * @param node - Node
 * @param expression - Expression
 * @param bindings - Bindings
 */
export function addShowHide(node: Element, expression: string, bindings: any) {
    const fn = evaluateExpression(expression, bindings);
    return effect(() => {
        (node as HTMLElement).style.display = fn() ? '' : 'none';
    });
}