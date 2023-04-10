import { Nominal } from '../../../utils/Nominal';

type BlockNodeNameBase = string;

export type BlockNodeName = Nominal<BlockNodeNameBase, 'BlockNodeName'>;

export const createBlockNodeName = (name: BlockNodeNameBase): BlockNodeName => (name as BlockNodeName);
