import type { BlockChildType, NODE_TYPE_HIDDEN_PROP } from './BlockChildType.js';

/** Interface used to brand value data with a hidden type marker */
export interface ValueBrand {
  /** Hidden property marking this node as a value child */
  [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value;
}

/** Conditional type that adds value branding when V is an object-like type */
export type ValueSerialized<V = unknown> = V extends Record<string | number | symbol, unknown> ? V & ValueBrand : V;
