import type { BlockTuneName, DataKey } from '../../../entities';

/**
 * Alias for a document id
 */
type DocumentId = string;

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
export type BlockIndex = BlockIndexAlias;

/**
 * Numeric index for data or tune changes in block node
 */
export type StartIndex = number;

export type EndIndex = number;

export type RangeIndex = `${StartIndex}:${EndIndex}`;

/**
 * Index for data changes in block node
 */
export type DataIndex = `data@${DataKey}` | `data@${DataKey}:${StartIndex}` | `data@${DataKey}:${StartIndex}:${EndIndex}`;

/**
 * Index for tune changes in block node
 */
export type TuneIndex = `tune@${BlockTuneName}`;

export type PropertyIndex = `property@${string}`;

/**
 * Possible index types
 */
export type Index = DocumentIndex | BlockIndex | DataIndex | TuneIndex | StartIndex | EndIndex | RangeIndex;
