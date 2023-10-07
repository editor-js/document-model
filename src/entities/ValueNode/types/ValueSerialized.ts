import { BlockChildType } from '../../BlockNode/types';

/**
 * Type representing serialized ValueNode
 */
export type ValueSerialized<V = unknown> = V extends Record<string | number | symbol, unknown> ? V & { $t: BlockChildType.Value } : V;
