import type { BlockTuneName, DataKey } from '../../../entities';
import type { Nominal } from '../../Nominal';

/**
 * Alias for a document id
 */
type DocumentId = Nominal<string, 'DocumentId'>;

/**
 * Numeric id for a block node
 */
type BlockIndexAlias = number;

/**
 * Index for a document node
 */
export type DocumentIndex = DocumentId;

/**
 * Index for a block node
 */
export type BlockIndex = [BlockIndexAlias];

export type TextRange = [number, number];

type DataIndex<Type extends 'data' | 'tune'> = [`${Type}@${Type extends 'data' ? DataKey : BlockTuneName}`, ...Partial<BlockIndex>];

export type TextIndex = [...TextRange, ...Partial<DataIndex<'data'>>];

export type ValueIndex = Partial<DataIndex<'data'>>;

export type TuneIndex = [string, ...Partial<DataIndex<'tune'>>];

export type PropertyIndex = [string, 'property'];

export type Index = BlockIndex | TextIndex | ValueIndex | TuneIndex | PropertyIndex;
