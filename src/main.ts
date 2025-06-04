import { defineComponent, ref, computed, onMounted, onUnmounted, useTemplateRef, defineProps, defineExpose, defineEmits, defineModel, render } from './index';

(window as any).defineComponent = defineComponent;


/**
 * Timer composable
 */
function useTimer() {
    const timer = ref(0);
    let timerHandle = 0;

    onMounted(() => {
        timerHandle = setInterval(() => {
            timer.value++;
        }, 1000);
    });

    onUnmounted(() => {
        clearInterval(timerHandle);
    });

    return timer;
}

defineComponent('example-heading', () => {
    const props = defineProps({ title: '' });
    const emit = defineEmits();
    const timer = useTimer();

    // Template is rendered using `render(templateString, bindings)`
    return render(`
        <div>
            <h1 @click="onClick">
                {{ title }} <span>Local timer: {{ timer }}</span>
            </h1>
            <p>
                <slot></slot>
            </p>
        </div>
    `, `
        h1 {
            color: red;
        }
    `, {
        // Pass all used props, variables, etc.
        timer,
        title: props.title,
        onClick: () => {
            emit('clicked', 'Arg 1', { arg2: 'Arg 2' });
        },
    });
});

defineComponent('example-input', () => {
    // const props = defineProps({});
    const model = defineModel();

    return render(`
        <input v-model="model" />
    `, {
        model,
    });
});

defineComponent('example-person', () => {
    defineProps({
        firstName: '',
        lastName: '',
        age: 0,
    });

    return render(`
        <div>
            <p>
                Hello {{ firstName }} {{ lastName }}, you are {{ age }} years old
            </p>
        </div>
    `, {
    });
});

const exampleComponent = defineComponent('example-component', () => {
    // `props` will contain all passed in props, including HTML element attributes
    const props = defineProps({
        title: '',
        texts: [],
        count: 0
    });

    const inputValue = ref('text');

    // State
    const clicks = ref(0);

    // v-bind data
    const vBindData = { firstName: 'John', lastName: 'Doe' };

    // Composable
    const timer = useTimer();

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
        clicks.value++;
        console.log('Clicked', event);
    };

    const onHeadingClicked = (...args: any[]) => {
        console.log('Heading clicked', args);
    };

    // When component is mounted template element references exist
    onMounted(() => {
        console.log('Mounted:', rootElementRef.value);
    });

    onUnmounted(() => {
        console.log('unmounted example-component');
    });

    // Expose values onto HTML element
    // `document.querySelector('#my-example-component').timer` => number
    defineExpose({
        timer,
    });

    // Template is rendered using `render(templateString, bindings)`
    render(`
        <div ref="root" class="component" :class="className">
            <h1 @click="onClick">{{ fullTitle }}, you clicked me {{ clicks }} times</h1>
            <input v-model="inputValue" />
            <example-input v-model="inputValue"></example-input>
            <p>
            Input value: {{ inputValue }}
            </p>

            <p>Binding:</p>
            <example-person v-bind="vBindData"></example-person>

            <p>
                Timer: {{ timer }} ({{ timer % 2 ? 'odd' : 'even' }})<br />
                Text count: {{ withTexts.value ? texts.length : 0 }}<br />
                Item count: {{ withItems.value ? items.length : 0 }}
            </p>
            <p v-if="timer % 3 === 0">
                v-if: Aaa
            </p>
            <p v-else-if="timer % 3 === 1">
                v-else-if: Bbb
            </p>
            <p v-else>
                v-else: Ccc
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
        clicks,
        className,
        fullTitle,
        timer,
        inputValue,
        onClick,
        onHeadingClicked,
        vBindData,
    });
});

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
