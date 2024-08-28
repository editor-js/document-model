import type { Nominal } from '../../utils/Nominal.js';

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

