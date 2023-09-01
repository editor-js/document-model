import type { BlockNode } from '../../BlockNode';
import type { Properties } from './Properties';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  children: BlockNode[];

  /**
   * The properties of the document
   */
  properties?: Properties;
}
