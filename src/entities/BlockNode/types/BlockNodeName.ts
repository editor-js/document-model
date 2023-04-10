import { Nominal } from '../../../utils/Nominal';

export type BlockNodeName = Nominal<string, 'BlockNodeName'>;

export const createBlockNodeName = (name: string): BlockNodeName => (name as BlockNodeName);
