declare const __nominal__: unique symbol;

export type Nominal<Type, Identifier> = Type & { readonly [__nominal__]: Identifier };
