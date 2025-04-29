// @ts-ignore
import { reactive, effect, computed, signal, untracked, Signal } from './signal-reactive';
import type { Computed } from '@webreflection/signal';

export type TemplateRef = Signal<HTMLElement|HTMLElement[]|undefined>;
export type TemplateRefs = Record<string, TemplateRef>;


export type RenderResult = {
    refs: TemplateRefs,
    element: Node,
    dispose: () => void,
} | null;

type ReplacementResult = () => void;

const SPLIT_CHAR = 'ᦌ￝';
const ATTR_V_HTML = 'v-html';

function evaluateExpression(expression: string, bindings: any) {
    return new Function(`with(this){return ${expression}}`).bind(bindings);
}

/**
 * Traverse dom tree
 *
 * @param element Element
 * @param callback Callback function
 */
function traverseDOM(element: Node, callback: (element: Node, index: number) => void|boolean) {
    const nodes = Array.from(element.childNodes);

    for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        const continueTraverse = callback(child, i);

        if (continueTraverse !== false && child.nodeType === Node.ELEMENT_NODE) {
            traverseDOM(child, callback)
        }
    }
}

function resultToAttributeValue(result: string|any):string {
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

function resultToString(result: string|any) {
    if (result === null || result === undefined) {
        return '';
    } else {
        return '' + result;
    }
}

/**
 * Find stuff to replace in a text node
 *
 * @param node - Text node
 * @param bindings - Bindings
 * @returns
 */
function findStringReplacements(node: Node, bindings: any): ReplacementResult[] {
    const text = node.textContent;

    if (text && text.includes('{{')) {
        // Find all parts which needs to be replaced
        const replacements:Array<() => any> = [];
        const textParts = text.replace(/{{(.*?)}}/g, (_, content) => {
            // Convert expression to actual function
            const fn = evaluateExpression(content.trim(), bindings);
            replacements.push(fn);
            return SPLIT_CHAR;
        }).split(SPLIT_CHAR);

        // Update function
        return [
            effect(() => {
                const result = [textParts[0]];
                for (let i = 1; i < textParts.length; i++) {
                    const value = replacements[i - 1]();
                    result.push(resultToString(value));
                    result.push(textParts[i]);
                }

                node.textContent = result.join('');
            })
        ];
    } else {
        return [];
    }
}

function addEventListener(node:Element, eventName: string, callbackName: string, bindings: any) {
    node.addEventListener(eventName, function (event) {
        if (callbackName in bindings && typeof bindings[callbackName] === 'function') {
            if ((event as CustomEvent)?.detail?.tinyVue) {
                return bindings[callbackName].apply(bindings, (event as CustomEvent).detail.args);
            } else {
                return bindings[callbackName].call(bindings, event);
            }
        }
    });
}

function addAttribute(node: Element, attributeName: string, expression: string, bindings: any) {
    let attributeValue = node.getAttribute(attributeName) || '';
    attributeValue = attributeValue ? attributeValue + ' ' : '';

    const fn = evaluateExpression(expression, bindings);

    if (attributeName === ATTR_V_HTML) {
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

function addProp(node: Element, attributeName: string, expression: string, bindings: any) {
    let attributeValue = node.getAttribute(attributeName) || '';
    attributeValue = attributeValue ? attributeValue + ' ' : '';

    const fn = evaluateExpression(expression, bindings);
    return computed(fn);
}

function addConditional(node: Element, expression: string, bindings: any) {
    const fn = evaluateExpression(expression, bindings);
    return effect(() => {
        (node as HTMLElement).style.display = fn() ? '' : 'none';
    });
}

function addIf(node: Element, expression: string, bindings: any):ReplacementResult {
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

function addFor(node: Element, attributeName: string, bindings: any, refs: any, customComponents: Set<string>):ReplacementResult {
    const [key, value] = attributeName.split(' in ');
    const getListValue = evaluateExpression(value, bindings);

    // We use marker node to know where to insert the first node
    const markerNode = document.createComment('');
    node.before(markerNode);

    let listDispose:ReplacementResult[] = [];
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
                    // if (lastListItem) {
                    //     lastListItem.after(element as HTMLElement);
                    // } else {
                    //     restoreDOMPlacement(element as HTMLElement, placement);
                    // }

                    lastListItem = element as HTMLElement;

                    listDispose.push(...disposeCallbacks);
                    listItems.push(element as HTMLElement);
                });
            });
        }
    });
}

/**
 * Attach event listeners
 *
 * @param node - Element
 * @param bindings - Bindings
 * @param refs - TemplateRefs
 */
function findAttributeReplacements(node: Element, bindings: any, refs: any, customComponents: Set<string>):ReplacementResult[] {
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

            while (nextSibling && (elseIfCondition = nextSibling.attributes.getNamedItem('v-else-if')?.value)) {
                // We save nextSibling to avoid side effect of nextSibling being removed
                const nextSiblingTmp = nextSibling;
                nextSibling = nextSibling.nextElementSibling;

                dispose.push(addIf(nextSiblingTmp, conditions.join('&&') + ` && (${ elseIfCondition })`, bindings));
                conditions.push(`!(${ elseIfCondition })`);
            }
            if (nextSibling && nextSibling.attributes.getNamedItem('v-else')) {
                dispose.push(addIf(nextSibling, conditions.join('&&'), bindings));
            }
        } else if (name === 'v-else') {
            // Do nothing, it's already handled by v-if
        } else if (name === 'v-show') {
            dispose.push(addConditional(node, value, bindings));
        } else if (name === 'v-hide') {
            dispose.push(addConditional(node, `!(${ value })`, bindings));
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
        } else if (name[0] === ':' || name === ATTR_V_HTML) {
            const propName = name === ATTR_V_HTML ? name : name.substring(1);

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

function renderElement(templateElement: HTMLElement, bindings: any, refs: any, customComponents: Set<string>): ReplacementResult[] {
    const disposeList:Array<() => void> = [];

    traverseDOM(templateElement, (node, _index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Replace strings
            findStringReplacements(node, bindings)
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
                findAttributeReplacements(element, bindings, refs, customComponents)
                    .forEach((dispose) => disposeList.push(dispose));
            }
        }
    });

    return disposeList;
}

/**
 * Render template as HTMLElement
 *
 * @param template - Template
 * @param bindings - Bindings
 * @param refs - TemplateRefs
 * @param customComponents - Custom components
 */
export function renderTemplate(template: string, bindings: any, refs: TemplateRefs, customComponents: Set<string>): RenderResult {
    const templateElement = document.createElement('div');
    templateElement.innerHTML = template;

    const disposeList = renderElement(templateElement, bindings, refs, customComponents);
    const element = templateElement.firstElementChild;

    if (element) {
        element.remove();

        return {
            refs,
            element,
            dispose: () => {
                disposeList.forEach((dispose) => dispose());
            },
        };
    } else {
        return null;
    }
}
