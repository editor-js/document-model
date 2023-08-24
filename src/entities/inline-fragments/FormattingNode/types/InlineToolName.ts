import { create, Nominal } from '../../../../utils/Nominal';

/**
 * Base type of the formatting node tool field
 */
type InlineToolNameBase = string;

/**
 * Nominal type for the formatting node tool field
 */
export type InlineToolName = Nominal<InlineToolNameBase, 'InlineToolName'>;

/**
 * Function returns a value with the nominal FormattingNodeName type
 */
export const createInlineToolName = create<InlineToolName>();
