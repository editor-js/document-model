/**
 * Creates a singletone factory.
 *
 * @example
 *   const useFoo = createSingletone(() => {
 *      const foo = 'bar';
 *
 *     return {
 *       foo,
 *     };
 *   });
 *
 * @param factory - factory function that will be called only once
 */
export function createSingletone<T>(factory: () => T): () => T {
  let instance: T | null = null;

  return () => {
    if (instance === null) {
      instance = factory();
    }

    return instance;
  };
}
