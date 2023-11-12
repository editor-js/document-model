/**
 * Alias for a document id
 */
type DocumentId = string;

/**
 * Alias for a block id
 */
type BlockId = string;

/**
 * Index for a block node
 */
export type BlockIndex = `${DocumentId}:${BlockId}`;

/**
 * Possible index types
 */
export type Index = BlockIndex;
