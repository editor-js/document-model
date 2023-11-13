import type { Nominal } from '../../../utils/Nominal';
import { create } from '../../../utils/Nominal.js';

/**
 * Base type of the block tune name field
 */
type BlockTuneNameBase = string;

/**
 * Nominal type for the block tune name field
 */
export type BlockTuneName = Nominal<BlockTuneNameBase, 'BlockTuneName'>;

/**
 * Function returns a value with the nominal BlockTuneName type
 */
export const createBlockTuneName = create<BlockTuneName>();
