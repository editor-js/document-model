import type { Nominal } from './Nominal.js';

/**
 * Nominal type for document identifiers
 */
export type DocumentId = Nominal<string, 'DocumentId'>;

/**
 * Alias for DocumentId used in event indexing
 */
export type DocumentIndex = DocumentId;
