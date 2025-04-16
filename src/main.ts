import { defineComponent, ref, computed, onMounted, onUnmounted, useTemplateRef, defineProps, defineExpose, defineEmits, render } from './index';

(window as any).defineComponent = defineComponent;

defineComponent('example-heading', () => {
    const props = defineProps({ title: '' });
    const emit = defineEmits();

    // Template is rendered using `render(templateString, bindings)`
    return render(`
        <div>
            <h1 @click="onClick">
                {{ title }}
            </h1>
            <p>
                <slot></slot>
            </p>
        </div>
    `, {
        // Pass all used props, variables, etc.
        title: props.title,
        onClick: () => {
            emit('clicked', 'Arg 1', { arg2: 'Arg 2' });
        },
    });
});

const exampleComponent = defineComponent('example-component', () => {
    // `props` will contain all passed in props, including HTML element attributes
    const props = defineProps({
        title: '',
        texts: [],
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

    const onHeadingClicked = (...args: any[]) => {
        console.log('Heading clicked', args);
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
            <p>
                Timer: {{ timer }} ({{ timer % 2 ? 'odd' : 'even' }})<br />
                Text count: {{ withTexts.value ? texts.length : 0 }}<br />
                Item count: {{ withItems.value ? items.length : 0 }}
            </p>
            <p v-if="(timer % 2) && withTimerText.value">
                v-if: Timer is odd
            </p>
            <p v-else>
                v-else: Timer is even
            </p>
            <p v-for="text in (withTexts.value ? texts : [])" style="border: 1px dashed #ccc; padding: 10px;">
                v-for: {{ text }}: {{ timer }}
            </p>
            <div v-for="i in (withItems.value ? items : [])" style="border: 1px solid #ccc; padding: 10px;">
                <div v-html="'v-for: This is v-html content <i>index: ' + i + '</i>, timer: <b>' + timer + '</b>'"></div>
                <example-heading :title="title + ' ' + i + ' ' + timer" @clicked="onHeadingClicked">
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
        onHeadingClicked,
    });
});


(window as any).withTimerText = ref(true);
(window as any).withTexts = ref(true);
(window as any).withItems = ref(true);

// We can also define props as reactive which allows us to change values later
const props = {
    title: ref('John'),
    texts: ref<string[]>([]),
    count: ref(5),
};

const htmlElement = exampleComponent(props);
document.body.appendChild(htmlElement);

// Because we defined props as reactive
setTimeout(() => {
    props.title.value = 'Jane';
    props.count.value = 2;
}, 2000);

setTimeout(() => {
    props.texts.value = ['Text 1', 'Text 2', 'Text 3'];
}, 4000);

setTimeout(() => {
    props.count.value = 0;
}, 6000);

setTimeout(() => {
    props.count.value = 2;
}, 8000);
