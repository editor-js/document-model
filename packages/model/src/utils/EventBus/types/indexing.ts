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

/**
 * Index for a text range
 */
export type TextRange = [number, number];

/**
 * Generic type for BlockNode elements
 */
type DataIndex<Type extends 'data' | 'tune'> = [`${Type}@${Type extends 'data' ? DataKey : BlockTuneName}`, ...Partial<BlockIndex>];

/**
 * TextNode index. It consists of a range of characters and an optional index of a block node
 */
export type TextIndex = [TextRange, ...Partial<DataIndex<'data'>>];

/**
 * ValueNode index
 */
export type ValueIndex = Partial<DataIndex<'data'>>;

/**
 * TuneNode index. It consists of a tune name and an optional index of a block node
 */
export type TuneIndex = [string, ...Partial<DataIndex<'tune'>>];

/**
 * PropertyNode index
 */
export type PropertyIndex = [string, 'property'];

/**
 * All possible indexes
 */
export type Index = BlockIndex | TextIndex | ValueIndex | TuneIndex | PropertyIndex;
