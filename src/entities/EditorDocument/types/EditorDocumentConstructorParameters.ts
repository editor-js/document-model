import { BlockNode } from '../../BlockNode';
import { PropName } from './PropName';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  children: BlockNode[];

  /**
   * The properties of the document
   */
  properties: Record<PropName, unknown>;
}
