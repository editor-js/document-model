import { create, Nominal } from '../../../utils/Nominal';

/**
 * Base type of the block node name field
 */
type BlockNodeNameBase = string;

/**
 * Nominal type for the block node name field
 */
export type BlockNodeName = Nominal<BlockNodeNameBase, 'BlockNodeName'>;

/**
 * Function returns a value with the nominal BlockNodeName type
 */
export const createBlockNodeName = create<BlockNodeName>();
