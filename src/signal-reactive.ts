// @ts-ignore
import { effect, computed, signal, untracked, Signal } from '@webreflection/signal';
import type { Computed } from '@webreflection/signal';

export type { Computed };

const getRawSymbol = Symbol();
const ARRAY_REMOVE_METHODS = ['pop', 'shift', 'splice'];

/**
 * Returns property from target
 *
 * @param {object} target Target object
 * @param {string} key Property
 * @returns {any} Property value
 */
function getProp (target: any, key: string | symbol) {
    if (key === getRawSymbol) {
        return (key: string) => target[key];
    } else if (key === 'peek') {
        return target;
    } else if (Array.isArray(target) && ARRAY_REMOVE_METHODS.includes(key as string)) {
        // Bind array methods to the target, otherwise it doesn't modify actual array length
        return target[key as any].bind(target);
    } else if (target[key] && typeof target[key] === 'object' && 'value' in target[key]) {
        // Return signal value
        return target[key] && target[key].value;
    } else if (!(key in target) && !Array.isArray(target)) {
        // If property does not exist, create it, but not for arrays because that would modify the array length
        return (target[key] = signal(undefined)).value;
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
    peek: () => any;
    [getRawSymbol]: (key: string) => any;
}

class ReactiveObjectClass {
    peek () {}
}

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
                const getRaw = (state as ReactiveObject)[getRawSymbol];
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

/**
 * Converts reactive object to value
 * @param value - Value
 * @returns Value
 */
function toValue(value: any) {
    if (value instanceof Signal) {
        return value.value;
    } else if (value instanceof ReactiveObjectClass) {
        return value.peek;
    } else {
        return value;
    }
}

export { effect, computed, signal, reactive, untracked, Signal, toValue };
