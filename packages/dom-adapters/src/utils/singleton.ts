/**
 * Creates a singleton factory.
 *
 * @example
 *   const useFoo = createSingleton(() => {
 *      const foo = 'bar';
 *
 *     return {
 *       foo,
 *     };
 *   });
 *
 * @param factory - factory function that will be called only once
 */
export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;

  return () => {
    if (instance === null) {
      instance = factory();
    }

    return instance;
  };
}
