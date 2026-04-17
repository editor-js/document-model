/**
 * Make all properties in T readonly
 */
export type DeepReadonly<T> =
    T extends (infer R)[] ? DeepReadonlyArray<R> :
      T extends (...args: unknown[]) => unknown ? T :
        T extends object ? DeepReadonlyObject<T> :
          T;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
