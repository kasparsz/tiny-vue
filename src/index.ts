import { type ReactiveObject, reactive, effect, computed, signal, Signal } from './signal-reactive';
import { type RenderResult, type TemplateRefs, renderTemplate } from './render';

enum ContextMethods {
    onMounted,
    onUnmounted,
    defineProps,
    defineExpose,
    useTemplateRef,
    render,

    rendered,
    renderResult,
    models,
    props,
    propsInit,
    propsInitialized,
    templateRefs,
    onMountedCallbacks,
    onUnmountedCallbacks,
    mutationObserver
};

type propsType = Record<string, any>;
type modelPropsType = { default?: any };
type modelType = [string, Signal<any>];

const customComponents: Set<string> = new Set();
let context: any[] = [];

function normalizeAttributeValue(value: string|undefined) {
    return value === '' ? true : (value && !isNaN(Number(value)) ? parseFloat(value) : value);
}

function getContext(fnName: string) {
    if (!context.length) {
        throw new Error(`Function ${fnName} must be called inside the component definition`);
    }
    return context[context.length - 1];
}

function onMounted(callback: () => void) {
    const context = getContext('onMounted');
    context[ContextMethods.onMountedCallbacks].push(callback);
}

function onUnmounted(callback: () => void) {
    const context = getContext('onUnmounted');
    context[ContextMethods.onUnmountedCallbacks].push(callback);
}

function onAttributeChanged(self: any, mutations: MutationRecord[]) {
    if (self[ContextMethods.props]) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                const name = mutation.attributeName as string;
                const oldValue = mutation.oldValue;
                const currentValue = self.attributes.getNamedItem(name)?.value;

                if (oldValue !== currentValue) {
                    self[ContextMethods.props][name] = normalizeAttributeValue(currentValue);
                }
            }
        }
    }
}

function render(template: string, style?: string|any, bindings?: any) {
    if (typeof style !== 'string') {
        bindings = style;
        style = undefined;
    }

    const context = getContext('render');

    // Initialize props if not initialized
    if (!context[ContextMethods.propsInitialized]) {
        defineProps({});
    }

    // Create reactive bindings from props
    const allBindings = reactive(bindings, context[ContextMethods.props] || {});

    // Bind model values to props
    context[ContextMethods.models].forEach(([name, refValue]: [string, Signal<any>]) => {
        effect(() => {
            refValue.value = allBindings[name];
        });
    });

    context[ContextMethods.renderResult] = renderTemplate(template, allBindings, context[ContextMethods.templateRefs], customComponents);

    // Add to DOM
    if (context[ContextMethods.renderResult]) {
        const shadow = context.attachShadow({ mode: "open" });
        shadow.appendChild(context[ContextMethods.renderResult].element);

        if (style) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(style);
            shadow.adoptedStyleSheets = [sheet];
        }
    }
}

function defineEmits() {
    const context = getContext('defineEmits');
    const self = context as any;

    return (eventName: string, ...args: any[]) => {
        const event = new CustomEvent(eventName, { detail: { tinyVue: true,args } });
        self.dispatchEvent(event);
    };
}

function defineModel(name?: string, props?: modelPropsType) {
    if (typeof props === 'object' && !name) {
        props = name as modelPropsType;
        name = 'model';
    } else if (!name) {
        name = 'model';
    }

    const context = getContext('defineModel');
    const signalValue = signal(props?.default || '');

    context[ContextMethods.models] = context[ContextMethods.models] || [];
    context[ContextMethods.models].push([name + 'Value', signalValue]);

    return signalValue;
}

function defineProps(propsDefaults: propsType) {
    const context = getContext('defineProps');

    const propsFromAttributes = Array.from(context.attributes as NodeListOf<Attr>).reduce((acc:Record<string, any>, attr:Attr) => {
        acc[attr.name] = normalizeAttributeValue(attr.value);
        return acc;
    }, {});

    context[ContextMethods.propsInitialized] = true;

    const propsInit = context[ContextMethods.propsInit] || {};
    const propsValues = Object.assign(propsDefaults, propsFromAttributes, propsInit);
    return context[ContextMethods.props] = reactive(propsValues);
}

function defineExpose(values: Record<string, any>) {
    const context = getContext('defineExpose');

    const self = context;
    effect(() => {
        for (const key in values) {
            self[key] = values[key] instanceof Signal ? values[key].value : values[key];
        }
    });
}

function useTemplateRef(name: string) {
    const context = getContext('useTemplateRef');

    if (!context[ContextMethods.templateRefs][name]) {
        context[ContextMethods.templateRefs][name] = signal(undefined);
    }

    return context[ContextMethods.templateRefs][name];
}

function nextTick(callback: () => void) {
    (window.requestIdleCallback || window.requestAnimationFrame)(callback);
}

function defineComponent(name: string, definitionCallback: (...args: any[]) => void) {
    class CustomElement extends HTMLElement {
        // We use enums for minification, private properties create additional code
        [ContextMethods.rendered]: boolean = false;
        [ContextMethods.renderResult]: RenderResult | null = null;
        [ContextMethods.props]: ReactiveObject | null = null;
        [ContextMethods.models]: modelType[] = [];
        [ContextMethods.propsInit]: propsType | null = null;
        [ContextMethods.propsInitialized]: boolean = false;
        [ContextMethods.templateRefs]: TemplateRefs = {};
        [ContextMethods.onMountedCallbacks]: (() => void)[] = [];
        [ContextMethods.onUnmountedCallbacks]: (() => void)[] = [];
        [ContextMethods.mutationObserver]: MutationObserver | null = null;

        /**
         * Initialize component
         * @param props - Component props
         */
        tinyVue(props: propsType) {
            if (!this[ContextMethods.rendered]) {
                this[ContextMethods.rendered] = true;
                this[ContextMethods.propsInit] = props;

                context.push(this);
                definitionCallback();
                context.pop();

                this[ContextMethods.onMountedCallbacks].forEach((callback) => callback());
                this[ContextMethods.mutationObserver] = new MutationObserver(onAttributeChanged.bind(null, this));
                this[ContextMethods.mutationObserver].observe(this, { attributes: true });
            } else {
                // @TODO Why is it re-rendering?
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
            this[ContextMethods.onUnmountedCallbacks].forEach((callback) => callback());
            this[ContextMethods.renderResult]?.dispose();
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
