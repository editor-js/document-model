import { create, Nominal } from '../../../utils/Nominal';

type FormattingNodeDataBase = Record<string, unknown>;

export type FormattingNodeData = Nominal<FormattingNodeDataBase, 'FormattingNodeData'>;

export const createFormattingNodeData = create<FormattingNodeData>();
