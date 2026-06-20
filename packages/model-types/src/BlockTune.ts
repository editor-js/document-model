import type { Nominal } from './Nominal.js';
import { create } from './Nominal.js';

/** Name of a block tune */
export type BlockTuneName = Nominal<string, 'BlockTuneName'>;

/** Factory for BlockTuneName */
export const createBlockTuneName = create<BlockTuneName>();

/** Serialized data for a block tune */
export interface BlockTuneSerialized {
  [key: string]: unknown;
}
