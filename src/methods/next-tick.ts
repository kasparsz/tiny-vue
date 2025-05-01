/**
 * Calls callback on next tick
 *
 * @param callback - Callback to be called
 */
export function nextTick(callback: () => void) {
    (window.requestIdleCallback || window.requestAnimationFrame)(callback);
}