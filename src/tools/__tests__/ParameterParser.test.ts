import { describe, test, expect } from "vitest";
import { ParameterParser } from '../ParameterParser.js';

describe('ParameterParser', () => {
    describe('parse (named parameters)', () => {
        test('should parse empty string', () => {
            expect(ParameterParser.parse('')).toEqual({});
        });

        test('should parse simple string value', () => {
            expect(ParameterParser.parse('name="John"')).toEqual({ name: 'John' });
        });

        test('should parse multiple string values', () => {
            const result = ParameterParser.parse('name="John", city="NYC"');
            expect(result).toEqual({ name: 'John', city: 'NYC' });
        });

        test('should parse integer values', () => {
            expect(ParameterParser.parse('age=30')).toEqual({ age: 30 });
            expect(ParameterParser.parse('count=-5')).toEqual({ count: -5 });
        });

        test('should parse float values', () => {
            expect(ParameterParser.parse('price=19.99')).toEqual({ price: 19.99 });
            expect(ParameterParser.parse('temp=-3.5')).toEqual({ temp: -3.5 });
        });

        test('should parse boolean values', () => {
            expect(ParameterParser.parse('active=true')).toEqual({ active: true });
            expect(ParameterParser.parse('deleted=false')).toEqual({ deleted: false });
        });

        test('should parse null and undefined', () => {
            expect(ParameterParser.parse('data=null')).toEqual({ data: null });
            expect(ParameterParser.parse('value=undefined')).toEqual({ value: undefined });
        });

        test('should parse flag (no value) as true', () => {
            expect(ParameterParser.parse('enabled')).toEqual({ enabled: true });
        });

        test('should parse array values', () => {
            expect(ParameterParser.parse('items=[1, 2, 3]')).toEqual({ items: [1, 2, 3] });
            expect(ParameterParser.parse('tags=["a", "b", "c"]')).toEqual({ tags: ['a', 'b', 'c'] });
        });

        test('should parse object values', () => {
            expect(ParameterParser.parse('config={timeout: 5000}')).toEqual({
                config: { timeout: 5000 }
            });
            expect(ParameterParser.parse('user={name: "John", age: 30}')).toEqual({
                user: { name: 'John', age: 30 }
            });
        });

        test('should handle escaped quotes in strings', () => {
            expect(ParameterParser.parse('text="say \\"hello\\""')).toEqual({
                text: 'say "hello"'
            });
        });

        test('should handle escape sequences', () => {
            expect(ParameterParser.parse('text="line1\\nline2\\ttab"')).toEqual({
                text: 'line1\nline2\ttab'
            });
        });

        test('should handle commas in quoted strings', () => {
            expect(ParameterParser.parse('desc="hello, world", num=42')).toEqual({
                desc: 'hello, world',
                num: 42
            });
        });

        test('should handle nested arrays and objects', () => {
            const result = ParameterParser.parse('data={items: [1, 2], name: "test"}');
            expect(result).toEqual({
                data: { items: [1, 2], name: 'test' }
            });
        });

        test('should handle single quotes', () => {
            expect(ParameterParser.parse("name='John'")).toEqual({ name: 'John' });
        });

        test('should handle unquoted strings', () => {
            expect(ParameterParser.parse('path=/home/user/file.txt')).toEqual({
                path: '/home/user/file.txt'
            });
        });
    });

    describe('parsePositional', () => {
        test('should parse positional string arguments', () => {
            expect(ParameterParser.parsePositional('"hello"')).toEqual(['hello']);
        });

        test('should parse multiple positional arguments', () => {
            const result = ParameterParser.parsePositional('"hello", 123, true');
            expect(result).toEqual(['hello', 123, true]);
        });

        test('should parse mixed types', () => {
            const result = ParameterParser.parsePositional('42, 3.14, "text", false');
            expect(result).toEqual([42, 3.14, 'text', false]);
        });

        test('should handle arrays as positional args', () => {
            expect(ParameterParser.parsePositional('[1, 2, 3]')).toEqual([[1, 2, 3]]);
        });
    });
});
