import { Nominal } from '../../../utils/Nominal';

type BlockTuneNameBase = string;

export type BlockTuneName = Nominal<BlockTuneNameBase, 'BlockTuneName'>;

export const createBlockTuneName = (name: BlockTuneNameBase): BlockTuneName => (name as BlockTuneName);
