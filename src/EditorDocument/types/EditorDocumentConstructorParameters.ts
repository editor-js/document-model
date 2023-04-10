import { BlockNode } from '../../BlockNode';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  children: BlockNode[];

  /**
   * The properties of the document
   */
  properties: Record<string, unknown>;
}
