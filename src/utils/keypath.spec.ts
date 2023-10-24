/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, has, set } from './keypath';

describe('keypath util', () => {
  const value = 'value';

  describe('set()', () => {
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

    it('should insert value into an array by the correct index for numeric key parts when index is ', () => {
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
        a: [ value ],
      };

      const result = get(object, 'a.0');

      expect(result).toEqual(value);
    });

    it('should return value from an object inside an array', () => {
      const object = {
        a: [ { b: value } ],
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
});
