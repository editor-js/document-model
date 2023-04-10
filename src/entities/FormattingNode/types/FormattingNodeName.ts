import { Nominal } from '../../../utils/Nominal';

type FormattingNodeNameBase = string;

export type FormattingNodeName = Nominal<FormattingNodeNameBase, 'FormattingNodeName'>;

export const createFormattingNodeName = (name: FormattingNodeNameBase): FormattingNodeName => (name as FormattingNodeName);
