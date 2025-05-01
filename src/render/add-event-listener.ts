/**
 * Add event listener
 *
 * @param node - Node
 * @param eventName - Event name
 * @param callbackName - Callback name
 * @param bindings - Bindings
 */
export function addEventListener(node:Element, eventName: string, callbackName: string, bindings: any) {
    node.addEventListener(eventName, function (event) {
        if (callbackName in bindings && typeof bindings[callbackName] === 'function') {
            if ((event as CustomEvent)?.detail?.tinyVue) {
                return bindings[callbackName].apply(bindings, (event as CustomEvent).detail.args);
            } else {
                return bindings[callbackName].call(bindings, event);
            }
        }
    });
}
