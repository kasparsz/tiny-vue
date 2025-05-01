import { getContext, ContextMethodOnMountedCallbacks } from './context';

/**
 * Add a callback to be called when the component is mounted
 *
 * @param callback - Callback to be called
 */
export function onMounted(callback: () => void) {
    const context = getContext('onMounted');
    context[ContextMethodOnMountedCallbacks].push(callback);
}