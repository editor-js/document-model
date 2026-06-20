import type { BlockData } from './BlockNode.js';

/** Free-form properties that can be attached to a document */
export type Properties = Record<string, unknown>;

/** Represents the full document with its blocks and optional properties */
export interface DocumentData {
  /** Document identifier */
  identifier: string;
  /** List of blocks in the document */
  blocks: BlockData[];
  /** Document-level properties */
  properties: Properties;
}

/** Serialized representation of an EditorDocument */
export interface EditorDocumentSerialized {
  /** Document identifier */
  identifier: string;
  /** Array of serialized block nodes */
  blocks: BlockData[];
  /** Document-level properties */
  properties: Properties;
}
