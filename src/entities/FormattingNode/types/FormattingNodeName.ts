import { Nominal } from '../../../utils/Nominal';

export type FormattingNodeName = Nominal<string, 'FormattingNodeName'>;

export const createFormattingNodeName = (name: string): FormattingNodeName => (name as FormattingNodeName);
