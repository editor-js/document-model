import { BlockTuneName, DataKey } from '../../../entities';

/**
 * Alias for a document id
 */
type DocumentId = string;

/**
 * Alias for a block id
 */
type BlockId = string;

/**
 * Index for a document node
 */
export type DocumentIndex = DocumentId;

/**
 * Index for a block node
 */
export type BlockIndex = `${DocumentIndex}:${BlockId}`;

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
export type TuneIndex = `${BlockIndex}:tune@${BlockTuneName}:${StartIndex}`;

/**
 * Possible index types
 */
export type Index = DocumentIndex | BlockIndex | DataIndex | TuneIndex;
