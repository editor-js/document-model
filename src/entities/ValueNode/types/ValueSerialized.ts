import { BlockChildType } from '../../BlockNode/types';

export type ValueSerialized<V = unknown> = V extends Record<any, any> ? V & { $t: BlockChildType.Value } : V;
