import type { BlockNodeSerialized } from '../../BlockNode/types';
import type { Properties } from './Properties';

/**
 * Type representing serialized EditorDocument
 *
 * Serialized EditorDocument is a JSON object containing blocks and document properties
 */
export interface EditorDocumentSerialized {
  /**
   * Document identifier
   */
  identifier: string;

  /**
   * Array of serialized BlockNodes
   */
  blocks: BlockNodeSerialized[];

  /**
   * JSON object containing document properties (eg read-only)
   */
  properties: Properties;
}
