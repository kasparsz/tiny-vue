import { defineComponent, ref } from './index';

(window as any).defineComponent = defineComponent;

defineComponent('example-heading', ({ defineProps, render }) => {
    const props = defineProps({ title: '' });

    // Template is rendered using `render(templateString, bindings)`
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

const exampleComponent = defineComponent('example-component', ({ defineProps, defineExpose, useTemplateRef, render, computed, ref, onMounted, onUnmounted }) => {
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

    // Template is rendered using `render(templateString, bindings)`
    render(`
        <div ref="root" class="component" :class="className">
            <h1 @click="onClick">{{ fullTitle }}</h1>
            <p>Timer: {{ timer }}</p>
            <div v-for="i in items">
                <div v-html="'This is v-html content <i>index: ' + i + '</i>, timer: <b>' + timer + '</b>'"></div>
                <example-heading :title="title + ' ' + i + ' ' + timer">
                    This is heading slot content {{ timer }}
                </example-heading>
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

// We can also define props as reactive which allows us to change values later
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
}, 2000);