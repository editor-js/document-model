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
export type BlockIndex = BlockIndexAlias;

/**
 * Numeric index for data or tune changes in block node
 */
export type TextStartIndex = number;

export type TextEndIndex = number;

export type TextRangeIndex = `${TextStartIndex}:${TextEndIndex}`;

export type TextNodeInBlockIndex = `data@${DataKey}:${TextRangeIndex}`;

export type TextNodeInDocumentIndex = `${BlockIndex}:${TextNodeInBlockIndex}`;


/**
 * ValueNodes don't have own indexes, so we just put an empty string
 *
 * @example
 *
 */
export type ValueIndex = '';

export type ValueNodeInBlockIndex = `data@${DataKey}`;

export type ValueNodeInDocumentIndex = `${BlockIndex}:${ValueNodeInBlockIndex}`;

/**
 * Index for tune changes in block node
 */
export type TuneIndex = Nominal<string, 'TuneIndex'>;

export type TuneInBlockIndex = `tune@${BlockTuneName}:${string}`;

export type TuneInDocumentIndex = `${BlockIndex}:${TuneInBlockIndex}`;

export type PropertyIndex = `property@${string}`;

/**
 * Possible index types
 */
export type Index = ''
  | DocumentIndex
  | BlockIndex
  | TextRangeIndex
  | TextNodeInBlockIndex
  | TextNodeInDocumentIndex
  | ValueNodeInBlockIndex
  | ValueNodeInDocumentIndex
  | TuneIndex
  | TuneInBlockIndex
  | TuneInDocumentIndex
  | PropertyIndex;
