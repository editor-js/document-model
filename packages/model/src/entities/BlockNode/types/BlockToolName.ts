import type { Nominal } from '../../../utils/Nominal';
import { create } from '../../../utils/Nominal';

/**
 * Base type of the block node name field
 */
type BlockToolNameBase = string;

/**
 * Nominal type for the block node name field
 */
export type BlockToolName = Nominal<BlockToolNameBase, 'BlockToolName'>;

/**
 * Function returns a value with the nominal BlockToolName type
 */
export const createBlockToolName = create<BlockToolName>();
