import { addStringReplacements } from './add-string-replacements';
import { traverseDOM } from '../utils/traverse-dom';
import { addFor } from './add-for';
import { addAttributes } from './add-attributes';

import type { DisposeList } from './render.types';

/**
 * Render element
 *
 * @param templateElement - Template element
 * @param bindings - Bindings
 * @param refs - Refs
 * @param customComponents - Custom components
 */
export function renderElement(templateElement: HTMLElement, bindings: any, refs: any, customComponents: Set<string>): DisposeList[] {
    const disposeList:Array<() => void> = [];

    traverseDOM(templateElement, (node, _index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Replace strings
            addStringReplacements(node, bindings)
                .forEach((dispose) => disposeList.push(dispose));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const vForValue = element.getAttribute('v-for');

            if (vForValue) {
                element.removeAttribute('v-for');
                disposeList.push(
                    addFor(element, vForValue, bindings, refs, customComponents)
                );
                return false;
            } else {
                // Attribute replacements
                addAttributes(element, bindings, refs, customComponents)
                    .forEach((dispose) => disposeList.push(dispose));
            }
        }
    });

    return disposeList;
}
