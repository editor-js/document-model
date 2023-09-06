/* Stryker disable next-line StringLiteral */
const nominalField = '_nominal_';
/* Stryker disable next-line StringLiteral */
const baseTypeField = '_baseType_';

/**
 * An alias for creating a nominal type
 */
export type Nominal<Type, Identifier> = Type &
  { readonly [nominalField]: Identifier } &
  { readonly [baseTypeField]: Type };

/**
 * Alias returns base type of Nominal
 */
type Base<N extends Nominal<unknown, unknown>> = N[typeof baseTypeField];

/**
 * Asserts type to a value
 *
 * @param value - value to assert a type
 */
const assertType = <N extends Nominal<unknown, unknown>>(value: Base<N>): N => value as N;

/**
 * Generic function returns assertType function with Nominal type
 */
export const create = <N extends Nominal<unknown, unknown>>(): typeof assertType<N> => assertType<N>;
