import { effect } from '../signal-reactive';
import { evaluateExpression } from '../utils/evaluate-expression';
import { resultToString } from '../utils/result-to-string';
import { resultToAttributeValue } from '../utils/result-to-attribute-value';

export function addAttribute(node: Element, attributeName: string, expression: string, bindings: any) {
    let attributeValue = node.getAttribute(attributeName) || '';
    attributeValue = attributeValue ? attributeValue + ' ' : '';

    const fn = evaluateExpression(expression, bindings);

    if (attributeName === 'v-html') {
        return effect(() => {
            (node as HTMLElement).innerHTML = resultToString(fn());
        });
    } else if (attributeName === 'value') {
        return effect(() => {
            (node as HTMLInputElement).value = resultToString(fn());
        });
    } else {
        return effect(() => {
            (node as HTMLElement).setAttribute(attributeName, attributeValue + resultToAttributeValue(fn()));
        });
    }
}
