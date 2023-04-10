import { Nominal } from '../../../utils/Nominal';

export type BlockTuneName = Nominal<string, 'BlockTuneName'>;

export const createBlockTuneName = (name: string): BlockTuneName => (name as BlockTuneName);
