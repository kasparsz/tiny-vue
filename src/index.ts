import { reactive, effect, computed, signal, Signal } from './signal-reactive';
import { renderTemplate } from './render/render-template';
import { normalizeAttributeValue } from './utils/normalize-attribute-value';
import { getContext, setContext, popContext, ContextMethodRendered, ContextMethodRenderResult, ContextMethodModels, ContextMethodProps, ContextMethodPropsInit, ContextMethodPropsInitialized, ContextMethodTemplateRefs, ContextMethodOnMountedCallbacks, ContextMethodOnUnmountedCallbacks, ContextMethodMutationObserver } from './methods/context';

import { useTemplateRef } from './methods/use-template-ref';
import { onMounted } from './methods/on-mounted';
import { onUnmounted } from './methods/on-unmounted';
import { defineModel } from './methods/define-model';
import { defineEmits } from './methods/define-emits';
import { defineProps } from './methods/define-props';
import { defineExpose } from './methods/define-expose';
import { nextTick } from './methods/next-tick';

import type { ReactiveObject } from './signal-reactive';
import type { RenderResult } from './render/render.types';
import type { TemplateRefs } from './methods/use-template-ref';
import type { modelType } from './methods/define-model';
import type { propsType } from './methods/define-props';

const customComponents: Set<string> = new Set();

/**
 * On attribute change update props
 *
 * @param self - Self
 * @param mutations - Mutations
 */
function onAttributeChanged(self: any, mutations: MutationRecord[]) {
    for (const mutation of mutations) {
        const name = mutation.attributeName as string;
        const oldValue = mutation.oldValue;
        const currentValue = self.attributes.getNamedItem(name)?.value;

        if (oldValue !== currentValue) {
            self[ContextMethodProps][name] = normalizeAttributeValue(currentValue);
        }
    }
}

/**
 * Renders a template
 *
 * @param template - Template
 * @param style - Style
 * @param bindings - Bindings
 */
function render(template: string, style?: string|any, bindings?: any) {
    if (typeof style !== 'string') {
        bindings = style;
        style = undefined;
    }

    const context = getContext('render');

    // Initialize props if not initialized
    if (!context[ContextMethodPropsInitialized]) {
        defineProps({});
    }

    // Create reactive bindings from props
    const allBindings = reactive(bindings, context[ContextMethodProps] || {});

    // Bind model values to props
    context[ContextMethodModels].forEach(([name, refValue]: [string, Signal<any>]) => {
        effect(() => {
            refValue.value = allBindings[name];
        });
    });

    // Render template
    context[ContextMethodRenderResult] = renderTemplate(template, allBindings, context[ContextMethodTemplateRefs], customComponents);

    // Add to DOM
    if (context[ContextMethodRenderResult]) {
        const shadow = context.attachShadow({ mode: "open" });
        shadow.appendChild(context[ContextMethodRenderResult].element);

        if (style) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(style);
            shadow.adoptedStyleSheets = [sheet];
        }
    }
}

function defineComponent(name: string, definitionCallback: (...args: any[]) => void) {
    class CustomElement extends HTMLElement {
        // We use enums for minification, private properties create additional code
        [ContextMethodRendered]: boolean = false;
        [ContextMethodRenderResult]: RenderResult | null = null;
        [ContextMethodProps]: ReactiveObject | null = null;
        [ContextMethodModels]: modelType[] = [];
        [ContextMethodPropsInit]: propsType | null = null;
        [ContextMethodPropsInitialized]: boolean = false;
        [ContextMethodTemplateRefs]: TemplateRefs = {};
        [ContextMethodOnMountedCallbacks]: (() => void)[] = [];
        [ContextMethodOnUnmountedCallbacks]: (() => void)[] = [];
        [ContextMethodMutationObserver]: MutationObserver | null = null;

        /**
         * Initialize component
         * @param props - Component props
         */
        tinyVue(props: propsType) {
            if (!this[ContextMethodRendered]) {
                this[ContextMethodRendered] = true;
                this[ContextMethodPropsInit] = props;

                setContext(this);
                definitionCallback();
                popContext();

                this[ContextMethodOnMountedCallbacks].forEach((callback) => callback());
                this[ContextMethodMutationObserver] = new MutationObserver(onAttributeChanged.bind(null, this));
                this[ContextMethodMutationObserver].observe(this, { attributes: true });
            } else {
                // If component is moved then it's re-rendering, we don't actually need to do anything
            }
        }

        /**
         * When the element is connected to the document initialize without any props
         * When element is added through template tinyVue is called with props before
         * timeout
         */
        connectedCallback() {
            (window.requestIdleCallback || window.setTimeout)(() => {
                this.tinyVue({});
            });
        }

        /**
         * Called when the element is disconnected from the document
         */
        disconnectedCallback() {
            this[ContextMethodOnUnmountedCallbacks].forEach((callback) => callback());
            this[ContextMethodRenderResult]?.dispose();
        }
    };

    customElements.define(name, CustomElement);
    customComponents.add(name);

    return function (props: propsType) {
        const element = document.createElement(name) as CustomElement;
        element.tinyVue(props);
        return element;
    };
}

export {
    signal as ref,
    effect as watchEffect,
    computed,
    reactive,
    defineComponent,
    onMounted,
    onUnmounted,
    defineProps,
    defineModel,
    defineExpose,
    defineEmits,
    useTemplateRef,
    render,
    nextTick,
};
