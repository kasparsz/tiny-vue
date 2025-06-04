import { effect } from '../signal-reactive';
import { evaluateExpression } from '../utils/evaluate-expression';
import { resultToAttributeValue } from '../utils/result-to-attribute-value';
import { ContextMethodProps } from '../methods/context';
import type { Computed } from '../signal-reactive';

import type { DisposeList } from './render.types';

/**
 * Add v-bind
 *
 * @param node - Node
 * @param expression - Expression
 * @param bindings - Bindings
 * @param customComponents - Custom components
 * @param customComponentProps - Custom component props
 */
export function addBind(node: Element, expression: string, bindings: any, customComponents: Set<string>, customComponentProps: Record<string, Computed<any>>):DisposeList {
    const fn = evaluateExpression(expression, bindings);

    return effect(() => {
        const props = fn();

        const isCustomComponent = customComponents.has(node.localName);
        if (isCustomComponent) {
            const component = node as any;

            // 'props' is special property exposing props of the component
            for (let attributeName in props) {
                if (component[ContextMethodProps]) {
                    component[ContextMethodProps][attributeName] = props[attributeName];
                } else {
                    customComponentProps[attributeName] = props[attributeName];
                }
            }
        } else {
            for (let attributeName in props) {
                (node as HTMLElement).setAttribute(attributeName, resultToAttributeValue(props[attributeName]));
            }
        }
    });
}