import { create, Nominal } from '../../../utils/Nominal';

/**
 * Base type of the formatting node name field
 */
type FormattingNodeNameBase = string;

/**
 * Nominal type for the formatting node name field
 */
export type FormattingNodeName = Nominal<FormattingNodeNameBase, 'FormattingNodeName'>;

/**
 * Function returns a value with the nominal FormattingNodeName type
 */
export const createFormattingNodeName = create<FormattingNodeName>();
