declare const nominalTypeField: unique symbol;

/**
 * An alias for creating a nominal type
 */
export type Nominal<Type, Identifier> = Type & { readonly [nominalTypeField]: Identifier };
