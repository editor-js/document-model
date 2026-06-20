import { create, type Nominal } from './Nominal.js';

export type InlineToolName = Nominal<string, 'InlineToolName'>;

export type InlineToolData = Nominal<Record<string, unknown>, 'InlineToolData'>;

/** Function returns a value with the nominal InlineToolName type */
export const createInlineToolName = create<InlineToolName>();

/** Function to cast values to InlineToolData type */
export const createInlineToolData = create<InlineToolData>();
