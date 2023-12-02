import type { Properties } from './Properties';
import type { BlockNodeSerialized } from '../../BlockNode/types';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  blocks?: BlockNodeSerialized[];

  /**
   * The properties of the document
   */
  properties?: Properties;
}
