/**
 * Generic type to get the type of constructor of a class
 */
export type Constructor<T> = new (...args: unknown[]) => T;
