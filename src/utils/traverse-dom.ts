/**
 * Traverse dom tree
 *
 * @param element Element
 * @param callback Callback function
 */
export function traverseDOM(element: Node, callback: (element: Node, index: number) => void|boolean) {
    const nodes = Array.from(element.childNodes);

    for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        const continueTraverse = callback(child, i);

        if (continueTraverse !== false && child.nodeType === Node.ELEMENT_NODE) {
            traverseDOM(child, callback)
        }
    }
}