import { reactive } from '../signal-reactive';
import { getContext, ContextMethodPropsInit, ContextMethodProps, ContextMethodPropsInitialized } from './context';
import { normalizeAttributeValue } from '../utils/normalize-attribute-value';

export type propsType = Record<string, any>;

/**
 * Define props
 *
 * @param propsDefaults - Default props
 * @returns Props
 */
export function defineProps(propsDefaults: propsType) {
    const context = getContext('defineProps');

    const propsFromAttributes = Array.from(context.attributes as NodeListOf<Attr>).reduce((acc:Record<string, any>, attr:Attr) => {
        acc[attr.name] = normalizeAttributeValue(attr.value);
        return acc;
    }, {});

    context[ContextMethodPropsInitialized] = true;

    const propsInit = context[ContextMethodPropsInit] || {};
    const propsValues = Object.assign(propsDefaults, propsFromAttributes, propsInit);
    return context[ContextMethodProps] = reactive(propsValues);
}