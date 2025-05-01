let context: any[] = [];

// We use constants for minification, private properties create additional code
export const ContextMethodOnMounted = 0;
export const ContextMethodOnUnmounted = 1;
export const ContextMethodDefineProps = 2;
export const ContextMethodDefineExpose = 3;
export const ContextMethodDefineEmits = 4;
export const ContextMethodUseTemplateRef = 5;
export const ContextMethodRender = 6;
export const ContextMethodRendered = 7;
export const ContextMethodRenderResult = 8;
export const ContextMethodModels = 9;
export const ContextMethodProps = 10;
export const ContextMethodPropsInit = 11;
export const ContextMethodPropsInitialized = 12;
export const ContextMethodTemplateRefs = 13;
export const ContextMethodOnMountedCallbacks = 14;
export const ContextMethodOnUnmountedCallbacks = 15;
export const ContextMethodMutationObserver = 16;

/**
 * Returns context, which is a TinyVue component instance
 *
 * @param fnName - Name of the function
 * @returns Context
 */
export function getContext(fnName: string) {
    if (!context.length) {
        throw new Error(`Function ${fnName} must be called inside the component definition`);
    }
    return context[context.length - 1];
}

/**
 * Sets context
 * @param instance - Instance
 */
export function setContext(instance: any) {
    context.push(instance);
}

/**
 * Pops context, removes last added instance
 */
export function popContext() {
    context.pop();
}
