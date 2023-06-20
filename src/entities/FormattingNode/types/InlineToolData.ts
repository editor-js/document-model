import { create, Nominal } from '../../../utils/Nominal';

type InlineToolDataBase = Record<string, unknown>;

export type InlineToolData = Nominal<InlineToolDataBase, 'InlineToolData'>;

export const createInlineToolData = create<InlineToolData>();
