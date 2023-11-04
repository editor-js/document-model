import { BlockChildType } from '../../BlockNode/types';
import { NODE_TYPE_HIDDEN_PROP } from '../../BlockNode/consts';

/**
 * Type representing serialized ValueNode
 *
 * Serialized ValueNode is a JSON primitive value or a JSON object with hidden property $t
 */
export type ValueSerialized<V = unknown> = V extends Record<string | number | symbol, unknown> ? V & { [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value } : V;
