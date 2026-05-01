/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, has, insert, remove, set } from './keypath.js';

describe('keypath util', () => {
  const value = 'value';

  describe('insert()', () => {
    it('should do nothing if no key passed', () => {
      const object: Record<string, any> = { a: ['x'] };

      insert(object, [], 'y');

      expect(object.a).toEqual(['x']);
    });

    it('should do nothing if the parent at the path is not an array', () => {
      const object: Record<string, any> = { a: { b: 'x' } };

      insert(object, 'a.0', 'y');

      expect(object.a).toEqual({ b: 'x' });
    });

    it('should do nothing if the parent path does not exist', () => {
      const object: Record<string, any> = {};

      expect(() => insert(object, 'a.0', 'y')).not.toThrow();
      expect(object).toEqual({});
    });

    it('should prepend a value into an array at index 0', () => {
      const object: Record<string, any> = { a: ['second', 'third'] };

      insert(object, 'a.0', 'first');

      expect(object.a).toEqual(['first', 'second', 'third']);
    });

    it('should insert a value at a middle index and shift existing elements right', () => {
      const object: Record<string, any> = { a: ['first', 'third'] };

      insert(object, 'a.1', 'second');

      expect(object.a).toEqual(['first', 'second', 'third']);
    });

    it('should append a value when index equals array length', () => {
      const object: Record<string, any> = { a: ['first', 'second'] };

      insert(object, 'a.2', 'third');

      expect(object.a).toEqual(['first', 'second', 'third']);
    });

    it('should insert into a nested array', () => {
      const object: Record<string, any> = { a: { b: ['x', 'z'] } };

      insert(object, 'a.b.1', 'y');

      expect(object.a.b).toEqual(['x', 'y', 'z']);
    });

    it('should accept keys as an array', () => {
      const object: Record<string, any> = { a: ['x', 'z'] };

      insert(object, ['a', '1'], 'y');

      expect(object.a).toEqual(['x', 'y', 'z']);
    });
  });

  describe('remove()', () => {
    it('should do nothing if no key passed', () => {
      const object = {};

      set(object, [], value);

      expect(object).toEqual(object);
    });

    it('should created nested objects by string key parts', () => {
      const object: Record<string, any> = {};

      set(object, 'a.b.c', value);

      expect(object.a.b.c).toEqual(value);
    });

    it('should created nested objects by string key parts when keys passed as an array', () => {
      const object: Record<string, any> = {};

      set(object, ['a', 'b', 'c'], value);

      expect(object.a.b.c).toEqual(value);
    });

    it('should update existing value', () => {
      const updatedValue = 'updated value';
      const object = {
        value,
      };

      set(object, 'value', updatedValue);

      expect(object.value).toEqual(updatedValue);
    });

    it('should update existing nested value', () => {
      const updatedValue = 'updated value';
      const object = {
        a: { value },
      };

      set(object, 'a.value', updatedValue);

      expect(object.a.value).toEqual(updatedValue);
    });

    it('should not replace a nested object', () => {
      const updatedValue = 'updated value';
      const object = {
        a: {
          value,
          assert: 'assert',
        },
      };

      set(object, 'a.value', updatedValue);

      expect(object.a).toEqual({ assert: 'assert',
        value: updatedValue });
    });

    it('should create array for numeric key parts', () => {
      const object: Record<string, any> = {};

      set(object, 'a.0', value);

      expect(object.a).toBeInstanceOf(Array);
    });

    it('should insert value into array for numeric key parts', () => {
      const object: Record<string, any> = {};

      set(object, 'a.0', value);

      expect(object.a[0]).toEqual(value);
    });

    it('should insert value into an array by the correct index for numeric key parts when index is greater than array length', () => {
      const object: Record<string, any> = {};

      set(object, 'a.1', value);

      expect(object.a).toEqual([undefined, value]);
    });

    it('should create an object inside an array', () => {
      const object: Record<string, any> = {};

      set(object, 'a.0.b', value);

      expect(object.a[0].b).toEqual(value);
    });
  });

  describe('get()', () => {
    it('should return original object if no key is passed', () => {
      const object = {};

      const result = get(object, []);

      expect(result).toEqual(object);
    });

    it('should return value from nested objects', () => {
      const object = {
        a: {
          b: {
            c: value,
          },
        },
      };

      const result = get(object, 'a.b.c');

      expect(result).toEqual(value);
    });

    it('should return a nested object if keypath is not full', () => {
      const object = {
        a: {
          b: {
            c: value,
          },
        },
      };

      const result = get(object, 'a.b');

      expect(result).toEqual({ c: value });
    });

    it('should return value from nested objects when keys are passed as array', () => {
      const object = {
        a: {
          b: {
            c: value,
          },
        },
      };

      const result = get(object, ['a', 'b', 'c']);

      expect(result).toEqual(value);
    });

    it('should return value from an array', () => {
      const object = {
        a: [value],
      };

      const result = get(object, 'a.0');

      expect(result).toEqual(value);
    });

    it('should return value from an object inside an array', () => {
      const object = {
        a: [{ b: value }],
      };

      const result = get(object, 'a.0.b');

      expect(result).toEqual(value);
    });

    it('should return undefined if there is no value by given key', () => {
      const object = {};

      const result = get(object, 'a.b.c');

      expect(result).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true if value exists by keypath', () => {
      const object = {
        a: {
          b: {
            c: value,
          },
        },
      };

      const result = has(object, 'a.b.c');

      expect(result).toEqual(true);
    });

    it('should return false if value doesnt exist by keypath', () => {
      const object = {};

      const result = has(object, 'a.b.c');

      expect(result).toEqual(false);
    });

    it('should return true if value exists but equals false', () => {
      const object = {
        a: false,
      };

      const result = has(object, 'a');

      expect(result).toEqual(true);
    });

    it('should return true if value exists but equals 0', () => {
      const object = {
        a: 0,
      };

      const result = has(object, 'a');

      expect(result).toEqual(true);
    });

    it('should return true if value exists but equals null', () => {
      const object = {
        a: null,
      };

      const result = has(object, 'a');

      expect(result).toEqual(true);
    });

    it('should return true if value exists but equals empty string', () => {
      const object = {
        a: '',
      };

      const result = has(object, 'a');

      expect(result).toEqual(true);
    });
  });

  describe('remove()', () => {
    it('should do nothing if no key passed', () => {
      const object: Record<string, any> = { a: value };

      remove(object, []);

      expect(object).toEqual({ a: value });
    });

    it('should not delete the "undefined" property when empty keys array is passed', () => {
      const object: Record<string, any> = { undefined: value };

      remove(object, []);

      expect(object).toHaveProperty('undefined', value);
    });

    it('should remove a root-level property from an object', () => {
      const object: Record<string, any> = { a: value };

      remove(object, 'a');

      expect(object).not.toHaveProperty('a');
    });

    it('should remove a nested property from an object', () => {
      const object: Record<string, any> = { a: { b: { c: value } } };

      remove(object, 'a.b.c');

      expect(object.a.b).not.toHaveProperty('c');
    });

    it('should not affect sibling properties when removing a nested property', () => {
      const object: Record<string, any> = {
        a: {
          b: value,
          c: 'sibling',
        },
      };

      remove(object, 'a.b');

      expect(object.a).toEqual({ c: 'sibling' });
    });

    it('should splice an element out of an array', () => {
      const object: Record<string, any> = { a: ['first', 'second', 'third'] };

      remove(object, 'a.1');

      expect(object.a).toEqual(['first', 'third']);
    });

    it('should remove the first element of an array and shift remaining elements', () => {
      const object: Record<string, any> = { a: ['first', 'second'] };

      remove(object, 'a.0');

      expect(object.a).toEqual(['second']);
    });

    it('should do nothing if the path does not exist', () => {
      const object: Record<string, any> = { a: value };

      remove(object, 'a.b.c');

      expect(object).toEqual({ a: value });
    });

    it('should do nothing if an intermediate value in the path is null', () => {
      const object: Record<string, any> = { a: null };

      expect(() => remove(object, 'a.b')).not.toThrow();
      expect(object.a).toBeNull();
    });

    it('should remove keys passed as an array', () => {
      const object: Record<string, any> = { a: { b: value } };

      remove(object, ['a', 'b']);

      expect(object.a).not.toHaveProperty('b');
    });
  });
});
