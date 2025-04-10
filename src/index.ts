import { signal, Signal, computed, effect } from '@webreflection/signal';
import { reactive } from './signal-reactive';
import type { ReactiveObject } from './signal-reactive';
import { render } from './render';
import type { RenderResult, TemplateRefs } from './render';

type propsType = Record<string, any>;

const customComponents: Set<string> = new Set();

function normalizeAttributeValue(value: string|undefined) {
    return value === '' ? true : (value && !isNaN(Number(value)) ? parseFloat(value) : value);
}

function defineComponent(name: string, definitionCallback: (...args: any[]) => void) {
    class CustomElement extends HTMLElement {
        #rendered: boolean = false;
        #renderResult: RenderResult | null = null;
        #props: ReactiveObject | null = null;
        #templateRefs: TemplateRefs = {};
        #onMountedCallbacks: (() => void)[] = [];
        #onUnmountedCallbacks: (() => void)[] = [];
        #mutationObserver: MutationObserver | null = null;

        #defineProps (props: any, propsDefaults: propsType) {
            const propsFromAttributes = Array.from(this.attributes).reduce((acc:Record<string, any>, attr:Attr) => {
                acc[attr.name] = normalizeAttributeValue(attr.value);
                return acc;
            }, {});

            const propsValues = Object.assign(propsDefaults, propsFromAttributes, props);
            return this.#props = reactive(propsValues);
        }

        #defineExpose(values: Record<string, any>) {
            const self = this as unknown as Record<string, any>;
            effect(() => {
                for (const key in values) {
                    self[key] = values[key] instanceof Signal ? values[key].value : values[key];
                }
            });
        }

        #useTemplateRef(name: string) {
            if (!this.#templateRefs[name]) {
                this.#templateRefs[name] = signal(undefined);
            }
            return this.#templateRefs[name];
        }

        #render(template: string, data: any) {
            const fullData = reactive(data, this.#props || {});

            this.#renderResult = render(template, fullData, this.#templateRefs, customComponents);

            // Add to DOM
            if (this.#renderResult) {
                const shadow = this.attachShadow({ mode: "open" });
                shadow.appendChild(this.#renderResult.element);
            }
        }

        #onMounted(callback: () => void) {
            this.#onMountedCallbacks.push(callback);
        }

        #onUnmounted(callback: () => void) {
            this.#onUnmountedCallbacks.push(callback);
        }

        #onAttributeChanged(mutations: MutationRecord[]) {
            if (this.#props) {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes') {
                        const name = mutation.attributeName as string;
                        const oldValue = mutation.oldValue;
                        const currentValue = this.attributes.getNamedItem(name)?.value;

                        if (oldValue !== currentValue) {
                            this.#props[name] = normalizeAttributeValue(currentValue);
                        }
                    }
                }
            }
        }

        tinyVueInit(props: propsType) {
            if (!this.#rendered) {
                this.#rendered = true;

                definitionCallback({
                    defineProps: this.#defineProps.bind(this, props),
                    defineExpose: this.#defineExpose.bind(this),
                    onMounted: this.#onMounted.bind(this),
                    onUnmounted: this.#onUnmounted.bind(this),
                    render: this.#render.bind(this),
                    useTemplateRef: this.#useTemplateRef.bind(this),
                    ref: signal,
                    computed, effect, reactive,
                });

                this.#onMountedCallbacks.forEach((callback) => callback());
                this.#mutationObserver = new MutationObserver(this.#onAttributeChanged.bind(this));
                this.#mutationObserver.observe(this, { attributes: true });
            } else {
                // @TODO Why is it re-rendering?
            }
        }

        /**
         * When the element is connected to the document initialize without any props
         * When element is added through template tinyVueInit is called with props before
         * timeout
         */
        connectedCallback() {
            (window.requestIdleCallback || window.setTimeout)(() => {
                this.tinyVueInit({});
            });
        }

        /**
         * Called when the element is disconnected from the document
         */
        disconnectedCallback() {
            this.#onUnmountedCallbacks.forEach((callback) => callback());
            this.#renderResult?.dispose();
        }
    };

    customElements.define(name, CustomElement);
    customComponents.add(name);

    return function (props: propsType) {
        const element = document.createElement(name) as CustomElement;
        element.tinyVueInit(props);
        return element;
    };
}

export { signal as ref, computed, effect, reactive, defineComponent };
