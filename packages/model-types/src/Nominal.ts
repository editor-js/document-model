/**
 * Property key used to brand the nominal type's identifier
 */
const nominalField = '_nominal_';

/**
 * Property key used to brand the nominal type's base type
 */
const baseTypeField = '_baseType_';

/**
 * Nominal type branding helper.
 * Use to create opaque types that are structurally compatible at runtime but distinct at compile time.
 * Must match the Nominal type in @editorjs/model for cross-package structural compatibility.
 */
export type Nominal<Type, Identifier> = Type &
  {
    /** Brand carrying the nominal type's identifier */
    readonly [nominalField]: Identifier;
  } &
  {
    /** Brand carrying the nominal type's base type */
    readonly [baseTypeField]: Type;
  };

/**
 * Alias returns base type of Nominal
 */
type Base<N extends Nominal<unknown, unknown>> = N[typeof baseTypeField];

/**
 * Asserts type to a value
 * @param value - value to assert a type
 */
const assertType = <N extends Nominal<unknown, unknown>>(value: Base<N>): N => value as N;

/**
 * Generic function returns assertType function with Nominal type
 */
export const create = <N extends Nominal<unknown, unknown>>(): typeof assertType<N> => assertType<N>;
