import { expect, test } from 'vitest';
import { normalizeAttributeValue } from './normalize-attribute-value';

test('normalizeAttributeValue converts empty string to true', () => {
    expect(normalizeAttributeValue('')).toBe(true);
});

test('normalizeAttributeValue converts string to number', () => {
    expect(normalizeAttributeValue('1.5')).toBe(1.5);
    expect(normalizeAttributeValue('-1.5')).toBe(-1.5);
    expect(normalizeAttributeValue('0')).toBe(0);
});

test('normalizeAttributeValue doesn\'t convert other types', () => {
    expect(normalizeAttributeValue('true')).toBe('true');
    expect(normalizeAttributeValue(true)).toBe(true);
    expect(normalizeAttributeValue(false)).toBe(false);
    expect(normalizeAttributeValue(0)).toBe(0);
    expect(normalizeAttributeValue(1)).toBe(1);
    expect(normalizeAttributeValue(-1)).toBe(-1);
    expect(normalizeAttributeValue(NaN)).toBe(NaN);
    expect(normalizeAttributeValue(null)).toBe(null);
    expect(normalizeAttributeValue(undefined)).toBe(undefined);
});
