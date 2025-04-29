# @kasparsz/tiny-vue

Minimalistic Vue implementation:
* no virtual DOM
* generates custom elements (web components)
* only dependency is @webreflection/signal (528 bytes)
* implements only a subset of VUE features

Minified: 6.17 Kb, gzip: 2.71Kb, brotli: 2.42Kb

## Install 

```bash
npm install @kasparsz/tiny-vue
```

## ToDo list

* `v-model`
* named slots

## Beyond the scope / won't implement

* `:is="..."`
* `<Transition>`
* `<TransitionGroup>`
* `effect` - use `watchEffect` instead

## Features

* Attributes `v-for`, `v-if`, `v-else-if`, `v-else`, `v-show`, `v-hide`, `ref`
* Dynamic properties using `:dynamic-props="..."`
* `defineEmits` and adding event listeners using `@event-listeners`
* Methods `onMounted`, `onUnmounted`, `useTemplateRef`, `defineProps`, `defineExpose`, `nextTick`
* Reactivity using `ref`, `computed`, `watchEffect`
* CSS, but it's scoped to the component

## Example

```js
import { defineComponent } from '@kasparsz/tiny-vue';
```

Additional functions which can be imported.

```js
import { defineComponent, ref, reactive, computed, watchEffect, onMounted, onUnmounted, useTemplateRef, defineProps, defineExpose, defineEmits, render } from '@kasparsz/tiny-vue';
```

Create component
```js
defineComponent('example-heading', () => {
    const props = defineProps({ title: '' });

    // Template is rendered using `render(templateString, styles?, bindings)`
    return render(`
        <div>
            <h1>
                {{ title }}
            </h1>
            <p>
                <slot></slot>
            </p>
        </div>
    `, {
        // Pass all used props, variables, etc.
        title: props.title,
    });
});
```

```js
defineComponent('example-component', () => {
    // `props` will contain all passed in props, including HTML element attributes
    const props = defineProps({
        title: '',
        count: 0
    });

    // Reactive value
    const timer = ref(0);
    let timerHandle = 0;

    // Computed values
    const fullTitle = computed(() => `Hello ${props.title}`);
    const items = computed(() => new Array(props.count).fill(0).map((_, i) => i));
    const className = computed(() => ({
        'component--with-title': !!props.title,
        'component--with-items': !!props.count,
    }));

    // References to elements
    const rootElementRef = useTemplateRef('root');

    // Event listeners
    const onClick = (event: MouseEvent) => {
        console.log('Clicked', event);
    };

    // When component is mounted template element references exist
    onMounted(() => {
        console.log('Mounted:', rootElementRef.value);

        timerHandle = setInterval(() => {
            timer.value++;
        }, 1000);
    });

    onUnmounted(() => {
        clearInterval(timerHandle);
    });

    // Expose values onto HTML element
    // `document.querySelector('#my-example-component').timer` => number
    defineExpose({
        timer,
    });

    // Template is rendered using `render(templateString, styles?, bindings)`
    render(`
        <div ref="root" class="component" :class="className">
            <h1 @click="onClick">{{ fullTitle }}</h1>
            <p>Timer: {{ timer }}</p>
            <div v-for="i in items">
                <example-heading :title="title + ' ' + i + ' ' + timer">
                    This is heading slot content {{ timer }}
                </example-heading>
                <div v-html="'This is v-html content <i>index: ' + i + '</i>, timer: <b>' + timer + '</b>'"></div>
            </div>
            <slot></slot>
        </div>
    `, {
        items,
        className,
        fullTitle,
        timer,
        onClick,
    });
});
```

Either use component directly from HTML

```html
<example-heading title="Jane">
    This is heading slot content
</example-heading>
```
```html
<example-component title="John" count="5">
    This is heading slot content
</example-component>
```

Or from JS

```js
import { defineComponent, ref } from '@kasparsz/tiny-vue';
const exampleComponent = defineComponent('example-component', ...);

// Calling component function returns HTML element
const htmlElement = exampleComponent({
    title: 'John',
    count: 5,
});

document.body.appendChild(htmlElement);
```

We can also define props as reactive which allows us to change values later

```js
import { defineComponent, ref } from '@kasparsz/tiny-vue';
const exampleComponent = defineComponent('example-component', ...);

const props = {
    title: ref('John'),
    count: ref(5),
};

const htmlElement = exampleComponent(props);
document.body.appendChild(htmlElement);

// Because we defined props as reactive
setTimeout(() => {
    props.title.value = 'Jane';
    props.count.value = 2;
}, 1000);
```

## Styling

Because this library is implemented using customElements styles are scoped.  

```js
defineComponent('example-heading', () => {
    const props = defineProps({ title: '' });

    return render(`
        <h1>
            {{ title }}
        </h1>
    `, `
        h1 {
            color: red;
        }
    `, {
        title: props.title,
    });
});
```

Styles are not dynamic and this __WILL NOT WORK__
```css
h1 {
    color: {{ color }}; // WILL NOT WORK!!!
}
```