import { evaluateExpression } from '../utils/evaluate-expression';
import { computed } from '../signal-reactive';

/**
 * Add prop
 *
 * @param node - Node
 * @param attributeName - Attribute name
 * @param expression - Expression
 */
export function addProp(node: Element, attributeName: string, expression: string, bindings: any) {
    let attributeValue = node.getAttribute(attributeName) || '';
    attributeValue = attributeValue ? attributeValue + ' ' : '';

    const fn = evaluateExpression(expression, bindings);
    return computed(fn);
}
