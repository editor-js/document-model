import { create, Nominal } from '../../../utils/Nominal';

type FormattingNodeNameBase = string;

export type FormattingNodeName = Nominal<FormattingNodeNameBase, 'FormattingNodeName'>;

export const createFormattingNodeName = create<FormattingNodeName>();
