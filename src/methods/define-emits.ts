import { getContext } from './context';

/**
 * Define emits
 * Unlike in VUE, TinyVUE doesn't have a list of event names
 *
 * @returns Emits
 */
export function defineEmits() {
    const context = getContext('defineEmits');
    const self = context as any;

    return (eventName: string, ...args: any[]) => {
        const event = new CustomEvent(eventName, { detail: { tinyVue: true,args } });
        self.dispatchEvent(event);
    };
}