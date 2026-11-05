import { deepEqual } from './deepEqual.js';

describe('deepEqual', () => {
  it('should treat equal primitives as equal', () => {
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it('should treat differing primitives as different', () => {
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('should compare plain records by their keys', () => {
    expect(deepEqual({ a: 1,
      b: { c: 2 } }, { a: 1,
      b: { c: 2 } })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1,
      b: 2 })).toBe(false);
  });

  it('should compare arrays element by element', () => {
    expect(deepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });

  it('should compare a record with a null prototype by its keys too', () => {
    const nullProto = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 });

    expect(deepEqual(nullProto, { a: 1 })).toBe(true);
  });

  /**
   * The store holds `structuredClone` output, which a host may build on another realm's `Object.prototype`:
   * comparing prototypes would call such a record exotic and report every write as a change
   */
  it('should compare a structuredClone of a record by its keys too', () => {
    expect(deepEqual(structuredClone({ a: 1,
      b: { c: 2 } }), { a: 1,
      b: { c: 2 } })).toBe(true);
  });

  /**
   * A value whose state is not in its own enumerable properties: comparing two by key finds none on either and
   * calls them equal, swallowing a write that changed one
   */
  it('should report two distinct non-plain objects as different', () => {
    expect(deepEqual(new Date(1), new Date(2))).toBe(false);
    expect(deepEqual(new Date(1), new Date(1))).toBe(false);
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
  });

  it('should still treat the same non-plain object as equal to itself', () => {
    const date = new Date(1);

    expect(deepEqual(date, date)).toBe(true);
  });
});
