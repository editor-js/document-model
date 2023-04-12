import { create, Nominal } from '../../../utils/Nominal';

type BlockNodeNameBase = string;

export type BlockNodeName = Nominal<BlockNodeNameBase, 'BlockNodeName'>;

export const createBlockNodeName = create<BlockNodeName>();
