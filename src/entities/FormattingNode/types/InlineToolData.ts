import { create, Nominal } from '../../../utils/Nominal';

/**
 * Base type for Inline Tool data
 */
type InlineToolDataBase = Record<string, unknown>;

/**
 * Nominal type for Inline Tool data
 */
export type InlineToolData = Nominal<InlineToolDataBase, 'InlineToolData'>;

/**
 * Function to cast values to InlineToolData type
 */
export const createInlineToolData = create<InlineToolData>();
