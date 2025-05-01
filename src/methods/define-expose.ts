import { effect, toValue } from '../signal-reactive';
import { getContext } from './context';

/**
 * Define expose
 *
 * @param values - Values to expose
 */
export function defineExpose(values: Record<string, any>) {
    const context = getContext('defineExpose');

    const self = context;
    effect(() => {
        for (const key in values) {
            self[key] = toValue(values[key]);
        }
    });
}