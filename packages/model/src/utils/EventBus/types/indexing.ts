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
 * Index for a start of a text range relative to a TextNode
 */
export type TextStartIndex = number;

/**
 * Index for an end of a text range relative to a TextNode
 */
export type TextEndIndex = number;

/**
 * Index for a text range relative to a TextNode
 */
export type TextRangeIndex = `${TextStartIndex}:${TextEndIndex}`;

/**
 * Index for text range relative to a BlockNode
 */
export type TextNodeInBlockIndex = `data@${DataKey}:${TextRangeIndex}`;

/**
 * Index for text range relative to a DocumentNode
 */
export type TextNodeInDocumentIndex = `${BlockIndex}:${TextNodeInBlockIndex}`;


/**
 * ValueNodes don't have own indexes, so we just put an empty string
 */
export type ValueIndex = '';

/**
 * Index for ValueNode relative to a BlockNode
 */
export type ValueNodeInBlockIndex = `data@${DataKey}`;

/**
 * Index for ValueNode relative to a DocumentNode
 */
export type ValueNodeInDocumentIndex = `${BlockIndex}:${ValueNodeInBlockIndex}`;

/**
 * Index for a BlockTune value
 */
export type TuneIndex = Nominal<string, 'TuneIndex'>;

/**
 * Index for a BlockTune value relative to a BlockNode
 */
export type TuneInBlockIndex = `tune@${BlockTuneName}:${string}`;

/**
 * Index for a BlockTune value relative to a DocumentNode
 */
export type TuneInDocumentIndex = `${BlockIndex}:${TuneInBlockIndex}`;

/**
 * Index for a DocumentNode property value
 */
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
