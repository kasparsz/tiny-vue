import { renderElement } from './render-element';

import type { TemplateRefs } from '../methods/use-template-ref';
import type { RenderResult } from './render.types';

/**
 * Render template as HTMLElement
 *
 * @param template - Template
 * @param bindings - Bindings
 * @param refs - TemplateRefs
 * @param customComponents - Custom components
 */
export function renderTemplate(template: string, bindings: any, refs: TemplateRefs, customComponents: Set<string>): RenderResult {
    const templateElement = document.createElement('div');
    templateElement.innerHTML = template;

    const disposeList = renderElement(templateElement, bindings, refs, customComponents);
    const element = templateElement.firstElementChild;

    if (element) {
        element.remove();

        return {
            refs,
            element,
            dispose: () => {
                disposeList.forEach((dispose) => dispose());
            },
        };
    } else {
        return null;
    }
}
