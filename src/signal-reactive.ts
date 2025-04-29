// @ts-ignore
import { effect, computed, signal, untracked, Signal } from '@webreflection/signal';

const symbolPeek = Symbol();

/**
 * Returns property from target
 *
 * @param {object} target Target object
 * @param {string} key Property
 * @returns {any} Property value
 */
function getProp (target: any, key: string | symbol) {
    if (key === symbolPeek) {
        return (key: string) => target[key];
    } else if (Array.isArray(target) && key in Array.prototype) {
        return target[key as keyof Array<any>];
    } else if (target[key] && 'value' in target[key]) {
        return target[key] && target[key].value;
    } else {
        return target[key];
    }
}

/**
 * Set property to target
 * @param {object} target Target object
 * @param {string} key Property
 * @param {any} value Property value
 * @returns
 */
function setProp (target: Record<string|symbol, any>, key: string | symbol, value: any) {
    if (value instanceof Signal) {
        target[key] = value;
    } else if (Array.isArray(target) && key in Array.prototype) {
        // target[key as keyof Array<any>] = value;
    } else if (key in target) {
        target[key].value = value;
    } else {
        target[key] = signal(value);
    }
    return true;
}

/**
 * Returns an object from the state, which uses
 * signal under the hood while allowing to get/set values without using .value
 *
 * @param {object} state State
 * @returns {object} Proxy object
 * @example
 *     const data = reactive({ name: 'John', age: 30 });
 *     const dataOnlyAgeIsReactive = reactive( name: 'John', age: 30 }, ['age']);
 *
 *     // Set values
 *     data.name = 'Jane';
 *
 *     // Get values
 *     console.log(`${ data.name } is ${ data.age } years old`); // => 'Jane is 30 years old'
 *
 *     // Output info when data changes
 *     effect(() => {
 *         console.log(`${ data.name } is ${ data.age } years old`);
 *     });
 */
export interface ReactiveObject {
    [key: string]: any;
    [symbolPeek]: (key: string) => any;
}

class ReactiveObjectClass {}

/**
 * Returns an object from the state, which uses
 * signal under the hood while allowing to get/set values without using .value
 *
 * @param {object} state State
 * @returns {object} Proxy object
 * @example
 *     const data = reactive({ name: 'John', age: 30 });
 *
 *     // Set values
 *     data.name = 'Jane';
 *
 *     // Get values
 *     console.log(`${ data.name } is ${ data.age } years old`); // => 'Jane is 30 years old'
 *
 *     // Output info when data changes
 *     effect(() => {
 *         console.log(`${ data.name } is ${ data.age } years old`);
 *     });
 */
function reactive(...states: Record<string, any>[]) {
    const signalState: Record<string|symbol, any> = Array.isArray(states[0]) ? [] : {};

    untracked(() => {
        states.forEach((state) => {
            if (state instanceof ReactiveObjectClass) {
                // Copy signals, so that changing old object value also changes
                // new object value and vice-versa
                const getRaw = (state as ReactiveObject)[symbolPeek];
                for (let key in state) {
                    setProp(signalState, key, getRaw(key));
                }
            } else {
                for (let key in state) {
                    setProp(signalState, key, state[key]);
                }
            }
        });
    });

    return new Proxy(signalState, {
        get: getProp,
        set: setProp,

        // Allow `data instanceof ReactiveObject`
        getPrototypeOf: () => ReactiveObjectClass.prototype
    });
}

export { effect, computed, signal, reactive, untracked, Signal };
