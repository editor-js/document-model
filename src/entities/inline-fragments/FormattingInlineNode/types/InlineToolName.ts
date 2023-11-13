import type { Nominal } from '../../../../utils/Nominal';
import { create } from '../../../../utils/Nominal.js';

/**
 * Base type of the formatting node tool field
 */
type InlineToolNameBase = string;

/**
 * Nominal type for the formatting node tool field
 */
export type InlineToolName = Nominal<InlineToolNameBase, 'InlineToolName'>;

/**
 * Function returns a value with the nominal InlineToolName type
 */
export const createInlineToolName = create<InlineToolName>();
