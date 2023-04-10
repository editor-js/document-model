declare const nominalTypeField: unique symbol;

export type Nominal<Type, Identifier> = Type & { readonly [nominalTypeField]: Identifier };
