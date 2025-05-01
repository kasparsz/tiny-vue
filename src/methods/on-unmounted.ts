import { getContext, ContextMethodOnUnmountedCallbacks } from './context';

/**
 * Add a callback to be called when the component is unmounted
 *
 * @param callback - Callback to be called
 */
export function onUnmounted(callback: () => void) {
    const context = getContext('onUnmounted');
    context[ContextMethodOnUnmountedCallbacks].push(callback);
}