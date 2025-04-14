// @ts-ignore
import { effect, computed, signal, untracked, Signal } from '@webreflection/signal';
import { reactive } from './signal-reactive';
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

enum DOMPlacement {
    INSERT_AFTER,
    PREPEND
}

function getDOMPlacement(node: Node): [DOMPlacement, ChildNode]|undefined {
    if (node.previousSibling) {
        return [DOMPlacement.INSERT_AFTER, node.previousSibling];
    } else if (node.parentElement) {
        return [DOMPlacement.PREPEND, node.parentElement];
    }
}
function restoreDOMPlacement(node: Node, placement?: [DOMPlacement, ChildNode]) {
    if (placement) {
        if (placement[0] === DOMPlacement.INSERT_AFTER) {
            (placement[1] as HTMLElement).after(node);
        } else if (placement[0] === DOMPlacement.PREPEND) {
            (placement[1] as HTMLElement).prepend(node);
        }
    }
}

/**
 * Traverse dom tree
 *
 * @param element Element
 * @param callback Callback function
 */
function traverseDOM(element: Node, callback: (element: Node, index: number) => void|boolean) {
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
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
            const fn = new Function(`with(this){return ${content.trim()}}`).bind(bindings);
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

    const fn = new Function('_n', '_an', '_av', '_f', '_h', `with(this){_h?_n.innerHTML=_f(${expression}):_n.setAttribute(_an,_av+_f(${expression}))}`).bind(bindings, node, attributeName, attributeValue, resultToAttributeValue, attributeName === ATTR_V_HTML);
    return effect(fn);
}

function addProp(node: Element, attributeName: string, expression: string, bindings: any) {
    let attributeValue = node.getAttribute(attributeName) || '';
    attributeValue = attributeValue ? attributeValue + ' ' : '';

    const fn = new Function(`with(this){ return ${expression} }`).bind(bindings);
    return computed(fn);
}

function addConditional(node: Element, expression: string, bindings: any) {
    const fn = new Function('_n', `with(this){_n.style.display=(${expression})?'':'none'}`).bind(bindings, node);
    return effect(fn);
}

function addFor(node: Element, attributeName: string, bindings: any, refs: any, customComponents: Set<string>):ReplacementResult {
    const [key, value] = attributeName.split(' in ');
    const placement = getDOMPlacement(node);
    const getListValue = new Function(`with(this){return ${value}}`).bind(bindings);

    // Remove node from the DOM
    node.remove();

    let listDispose:ReplacementResult[] = [];
    let listItems:HTMLElement[] = [];

    return effect(() => {
        listDispose.forEach((dispose) => dispose());
        listItems.forEach((item) => item.remove());
        listDispose = [];
        listItems = [];

        const list = getListValue();
        let lastListItem:HTMLElement|null = null;

        if (Array.isArray(list)) {
            untracked(() => {
                list.forEach((item) => {
                    const element = node.cloneNode(true);
                    const templateElement = { childNodes: [element] } as unknown as HTMLElement;
                    const itemBindings = reactive(bindings, { [key]: item });
                    const disposeCallbacks = renderElement(templateElement, itemBindings, refs, customComponents);

                    if (lastListItem) {
                        lastListItem.after(element as HTMLElement);
                    } else {
                        restoreDOMPlacement(element as HTMLElement, placement);
                    }

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

        if (name === 'v-show') {
            dispose.push(addConditional(node, value, bindings));
        } else if (name === 'v-hide') {
            dispose.push(addConditional(node, `!(${ value })`, bindings));
        } else if (name.startsWith('@')) {
            addEventListener(node, name.substring(1), value, bindings);
        } else if (name.startsWith(':') || name === ATTR_V_HTML) {
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
