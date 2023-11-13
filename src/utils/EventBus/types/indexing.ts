import type { BlockTuneName, DataKey } from '../../../entities/index.js';

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
export type BlockIndex = `${DocumentIndex}:${BlockIndexAlias}`;

/**
 * Numeric index for data or tune changes in block node
 */
type StartIndex = number;

/**
 * Index for data changes in block node
 */
export type DataIndex = `${BlockIndex}:data@${DataKey}:${StartIndex}`;

/**
 * Index for tune changes in block node
 */
export type TuneIndex = `${BlockIndex}:tune@${BlockTuneName}`;

/**
 * Possible index types
 */
export type Index = DocumentIndex | BlockIndex | DataIndex | TuneIndex;
