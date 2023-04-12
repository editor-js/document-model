import { Nominal, create } from '../../../utils/Nominal';

type BlockTuneNameBase = string;

export type BlockTuneName = Nominal<BlockTuneNameBase, 'BlockTuneName'>;

export const createBlockTuneName = create<BlockTuneName>();
