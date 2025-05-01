import { effect, reactive, untracked } from '../signal-reactive';
import { evaluateExpression } from '../utils/evaluate-expression';
import { renderElement } from './render-element';

import type { DisposeList } from './render.types';
/**
 * Add for
 *
 * @param node - Node
 * @param attributeName - Attribute name
 * @param bindings - Bindings
 * @param refs - Refs
 * @param customComponents - Custom components
 */
export function addFor(node: Element, attributeName: string, bindings: any, refs: any, customComponents: Set<string>):DisposeList {
    const [key, value] = attributeName.split(' in ');
    const getListValue = evaluateExpression(value, bindings);

    // We use marker node to know where to insert the first node
    const markerNode = document.createComment('');
    node.before(markerNode);

    let listDispose:DisposeList[] = [];
    let listItems:HTMLElement[] = [];
    let lastListItem:HTMLElement|null = null;

    // Remove node after renderer has stopped traversing the DOM
    requestAnimationFrame(() => {
        node.remove();
    });

    return effect(() => {
        listDispose.forEach((dispose) => dispose());
        listItems.forEach((item) => item.remove());
        listDispose = [];
        listItems = [];
        lastListItem = null;

        const list = getListValue();

        if (Array.isArray(list)) {
            untracked(() => {
                list.forEach((item) => {
                    const element = node.cloneNode(true);
                    const templateElement = { childNodes: [element] } as unknown as HTMLElement;
                    const itemBindings = reactive(bindings, { [key]: item });
                    const disposeCallbacks = renderElement(templateElement, itemBindings, refs, customComponents);

                    (lastListItem || markerNode).after(element as HTMLElement);

                    lastListItem = element as HTMLElement;

                    listDispose.push(...disposeCallbacks);
                    listItems.push(element as HTMLElement);
                });
            });
        }
    });
}
