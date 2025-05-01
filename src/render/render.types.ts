import type { TemplateRefs } from '../methods/use-template-ref';

export type DisposeList = () => void;

export type RenderResult = {
    refs: TemplateRefs,
    element: Node,
    dispose: () => void,
} | null;
