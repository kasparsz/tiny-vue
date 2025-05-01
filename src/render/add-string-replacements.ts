import { evaluateExpression } from '../utils/evaluate-expression';
import { resultToString } from '../utils/result-to-string';
import { effect } from '../signal-reactive';

import type { DisposeList } from './render.types';

const SPLIT_CHAR = 'ᦌ￝';

/**
 * Find stuff to replace in a text node
 *
 * @param node - Text node
 * @param bindings - Bindings
 * @returns
 */
export function addStringReplacements(node: Node, bindings: any): DisposeList[] {
    const text = node.textContent;

    if (text && text.includes('{{')) {
        // Find all parts which needs to be replaced
        const replacements:Array<() => any> = [];
        const textParts = text.replace(/{{(.*?)}}/g, (_, content) => {
            // Convert expression to actual function
            const fn = evaluateExpression(content.trim(), bindings);
            replacements.push(fn);
            return SPLIT_CHAR;
        }).split(SPLIT_CHAR);

        // Update function
        return [
            effect(() => {
                const result = [textParts[0]];
                for (let i = 1; i < textParts.length; i++) {
                    const value = replacements[i - 1]();
                    result.push(resultToString(value));
                    result.push(textParts[i]);
                }

                node.textContent = result.join('');
            })
        ];
    } else {
        return [];
    }
}
