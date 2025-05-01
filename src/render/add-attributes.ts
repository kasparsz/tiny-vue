import { signal } from '../signal-reactive';

import { addIf } from './add-if';
import { addAttribute } from './add-attribute';
import { addProp } from './add-prop';
import { addShowHide } from './add-show-hide';
import { addEventListener } from './add-event-listener';

import type { DisposeList } from './render.types';
import type { Computed } from '../signal-reactive';


/**
 * Attach event listeners
 *
 * @param node - Element
 * @param bindings - Bindings
 * @param refs - TemplateRefs
 */
export function addAttributes(node: Element, bindings: any, refs: any, customComponents: Set<string>):DisposeList[] {
    const attributes = node.attributes;
    const dispose = [];
    const isCustomComponent = customComponents.has(node.localName);
    const customComponentProps:Record<string, Computed<any>> = {};

    for (let i = attributes.length - 1; i >=0 ; i--) {
        const attribute = attributes[i];
        const name = attribute.name;
        const value = attribute.value;

        if (name === 'v-if') {
            let nextSibling = node.nextElementSibling;
            let elseIfCondition:string|undefined;
            const conditions:string[] = [`!(${ value })`];

            dispose.push(addIf(node, value, bindings));

            // v-else-if
            while (nextSibling && (elseIfCondition = nextSibling.attributes.getNamedItem('v-else-if')?.value)) {
                // We save nextSibling to avoid side effect of nextSibling being removed
                const nextSiblingTmp = nextSibling;
                nextSibling = nextSibling.nextElementSibling;

                dispose.push(addIf(nextSiblingTmp, conditions.join('&&') + ` && (${ elseIfCondition })`, bindings));

                // Add negated condition to the condition list
                conditions.push(`!(${ elseIfCondition })`);
            }

            // v-else
            if (nextSibling && nextSibling.attributes.getNamedItem('v-else')) {
                dispose.push(addIf(nextSibling, conditions.join('&&'), bindings));
            }
        } else if (name === 'v-else' || name === 'v-else-if') {
            // Do nothing, it's already handled by v-if
        } else if (name === 'v-show') {
            dispose.push(addShowHide(node, value, bindings));
        } else if (name === 'v-hide') {
            dispose.push(addShowHide(node, `!(${ value })`, bindings));
        } else if (name === 'v-model') {
            let eventName = isCustomComponent ? 'update:modelValue' : 'input';

            if (isCustomComponent) {
                // @TODO add support for named models `v-model:title`
                customComponentProps['modelValue'] = addProp(node, name, value, bindings);
            } else {
                dispose.push(addAttribute(node, 'value', value, bindings));
            }

            // When input or custom element triggers 'update:modelValue', we need to trigger the event on the root node
            node.addEventListener(eventName, function (event) {
                const inputValue = event.type === 'update:modelValue' ? (event as CustomEvent).detail.args[0] : (event.target as HTMLInputElement).value;

                // Update the binding value, because model is 2 way binding
                bindings[value] = inputValue;

                // Dispatch the event on the root node
                const updateEvent = new CustomEvent('update:modelValue', { detail: { tinyVue: true, args: [inputValue] }, bubbles: false });
                const rootNode = node.getRootNode() as any;
                rootNode?.host.dispatchEvent(updateEvent);
            });
        } else if (name[0] === '@') {
            addEventListener(node, name.substring(1), value, bindings);
        } else if (name[0] === ':' || name === 'v-html') {
            const propName = name === 'v-html' ? name : name.substring(1);

            if (isCustomComponent) {
                customComponentProps[propName] = addProp(node, propName, value, bindings);
            } else {
                dispose.push(addAttribute(node, propName, value, bindings));
            }
        } else if (name === 'ref') {
            if (value in refs) {
                if (refs[value].value === undefined) {
                    refs[value].value = node;
                } else {
                    if (!Array.isArray(refs[value].value)) {
                        refs[value].value = [refs[value].value];
                    }

                    refs[value].value = [...refs[value].value, node];
                }
            } else {
                refs[value] = signal(node);
            }
        } else {
            continue;
        }

        node.removeAttribute(name);
    }

    if (isCustomComponent) {
        (node as any).tinyVue(customComponentProps);
    }

    return dispose;
}
