import { BlockNode } from '../BlockNode';
import { EditorDocumentConstructorParameters, PropName } from './types';

/**
 * EditorDocument class represents the top-level container for a tree-like structure of BlockNodes in an editor document.
 * It contains an array of BlockNodes representing the root-level nodes of the document.
 */
export class EditorDocument {
  /**
   * Private field representing the child BlockNodes of the EditorDocument
   */
  #children: BlockNode[];

  /**
   * Private field representing the properties of the document
   */
  #properties: Record<PropName, unknown>;

  /**
   * Constructor for EditorDocument class.
   *
   * @param args - EditorDocument constructor arguments.
   * @param args.children - The child BlockNodes of the EditorDocument.
   * @param args.properties - The properties of the document.
   */
  constructor({ children, properties }: EditorDocumentConstructorParameters) {
    this.#children = children;
    this.#properties = properties;
  }
}