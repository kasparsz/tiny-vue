import { expect, test, vi } from 'vitest';
import { reactive, effect } from './signal-reactive';

test('reactive object access', () => {
    const data = reactive({ name: 'John', age: 30 });
    expect(data.name).toBe('John');
    expect(data.age).toBe(30);
});

test('reactive object reactivity', () => {
    const data = reactive({ name: 'John', age: 30 });

    const spyName = vi.fn(() => data.name);

    effect(spyName);
    expect(spyName).toHaveBeenCalled();
    expect(spyName).toHaveReturnedWith('John');

    data.name = 'Jane';
    expect(spyName).toHaveBeenCalled();
    expect(spyName).toHaveReturnedWith('Jane');
});

test('reactive object reactivity on undefined property', () => {
    const data = reactive({ age: 30 });

    const spyName = vi.fn(() => data.name);

    effect(spyName);
    expect(spyName).toHaveBeenCalled();
    expect(spyName).toHaveReturnedWith(undefined);

    data.name = 'Jane';
    expect(spyName).toHaveBeenCalled();
    expect(spyName).toHaveReturnedWith('Jane');
});

test('reactive array access', () => {
    const data = reactive(['John', 'James']);
    expect(data.length).toBe(2);

    data.push('Jane'); // 'John', 'James', 'Jane'
    expect(data.length).toBe(3);
    expect(data[2]).toBe('Jane');

    data.unshift('Jack'); // 'Jack', 'John', 'James', 'Jane'
    expect(data.length).toBe(4);

    data.pop(); // 'Jack', 'John', 'James'
    expect(data.length).toBe(3);
    expect(data[3]).toBe(undefined);

    data.shift(); // 'John', 'James'
    expect(data.length).toBe(2);
    expect(data[0]).toBe('John');

    data.splice(0, 1); // 'James'
    expect(data.length).toBe(1);
    expect(data[0]).toBe('James');
});

test('reactive object with non-reactive properties', () => {
    const data = reactive({
        person: { name: 'John', age: 30 },
    });
    const person = data.person;

    const spyPersonProperty = vi.fn(() => data.person);
    const spyPersonName = vi.fn(() => person.name);

    effect(spyPersonProperty);
    effect(spyPersonName);

    expect(spyPersonProperty).toHaveBeenCalledTimes(1);
    expect(spyPersonName).toHaveBeenCalledTimes(1);

    // `person` is a signal, but it's not reactive object
    // so it doesn't trigger reactivity
    data.person.name = 'Jane';

    expect(spyPersonProperty).toHaveBeenCalledTimes(1);
    expect(spyPersonName).toHaveBeenCalledTimes(1);
});

test('reactive object with reactive properties', () => {
    const data = reactive({
        person: reactive({ name: 'John', age: 30 })
    });
    const person = data.person;

    const spyPersonProperty = vi.fn(() => data.person);
    const spyPersonName = vi.fn(() => person.name);
    const spyPersonPropertyName = vi.fn(() => data.person.name);

    effect(spyPersonProperty);
    effect(spyPersonName);
    effect(spyPersonPropertyName);

    expect(spyPersonProperty).toHaveBeenCalledTimes(1);
    expect(spyPersonName).toHaveBeenCalledTimes(1);
    expect(spyPersonPropertyName).toHaveBeenCalledTimes(1);

    // `person` property it no changed on `data` object
    // so it triggers only those which watch for `name` property
    data.person.name = 'Jane';

    expect(spyPersonProperty).toHaveBeenCalledTimes(1);
    expect(spyPersonName).toHaveBeenCalledTimes(2);
    expect(spyPersonPropertyName).toHaveBeenCalledTimes(2);
});