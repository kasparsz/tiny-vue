import { signal, type Signal } from '../signal-reactive';
import { getContext, ContextMethodModels } from './context';

type modelPropsType = { default?: any };
export type modelType = [string, Signal<any>];

/**
 * Define a model
 *
 * @param name - Name of the model
 * @param props - Props of the model
 * @returns Model signal
 */
export function defineModel(name?: string, props?: modelPropsType) {
    if (typeof props === 'object' && !name) {
        props = name as modelPropsType;
        name = 'model';
    } else if (!name) {
        name = 'model';
    }

    const context = getContext('defineModel');
    const signalValue = signal(props?.default || '');

    context[ContextMethodModels] = context[ContextMethodModels] || [];
    context[ContextMethodModels].push([name + 'Value', signalValue]);

    return signalValue;
}