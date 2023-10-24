import { mapObject } from './mapObject';

describe('mapObject()', () => {
  it('should map through passed object', () => {
    const object = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };

    const result = mapObject(object, (value) => value * 2);

    expect(result).toEqual({
      a: 2,
      b: 4,
      c: 6,
      d: 8,
    });
  });

  it('should pass key to map function', () => {
    const key = 'a';
    const object = { [key]: 'value' };

    /**
     * Map function
     *
     * @param value - entry value
     * @param k - entry key
     */
    const map = (value: string, k: string): string => {
      expect(k).toEqual(key);

      return value;
    };

    mapObject(object, map);
  });
});
