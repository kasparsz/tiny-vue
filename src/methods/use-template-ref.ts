import { signal, type Signal } from '../signal-reactive';
import { getContext, ContextMethodTemplateRefs } from './context';

export type TemplateRef = Signal<HTMLElement|HTMLElement[]|undefined>;
export type TemplateRefs = Record<string, TemplateRef>;

/**
 * Create a template ref
 * Template refs are signals which are updated with the DOM element after rendering
 *
 * @param name - Name of the ref
 * @returns Ref
 */
export function useTemplateRef(name: string) {
    const context = getContext('useTemplateRef');

    if (!context[ContextMethodTemplateRefs][name]) {
        context[ContextMethodTemplateRefs][name] = signal(undefined);
    }

    return context[ContextMethodTemplateRefs][name];
}