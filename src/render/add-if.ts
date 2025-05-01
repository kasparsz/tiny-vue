import { effect } from '../signal-reactive';
import { evaluateExpression } from '../utils/evaluate-expression';

import type { DisposeList } from './render.types';

/**
 * Add if
 *
 * @param node - Node
 * @param expression - Expression
 * @param bindings - Bindings
 */
export function addIf(node: Element, expression: string, bindings: any):DisposeList {
    // We use marker node to know where to insert the node
    const markerNode = document.createComment('');
    node.before(markerNode);

    const getConditionResult = evaluateExpression(expression, bindings);
    let isVisible = true;

    return effect(() => {
        isVisible = !!getConditionResult();

        if (isVisible) {
            markerNode.after(node);
        } else {
            node.remove();
        }
    });
}
