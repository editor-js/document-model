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

  /**
   * Adds a BlockNode to the EditorDocument at the specified index.
   * If no index is provided, the BlockNode will be added to the end of the array.
   * Throws an error if the index is out of bounds.
   *
   * @param blockNode - The BlockNode to add to the EditorDocument
   * @param index - The index at which to add the BlockNode
   */
  public addBlock(blockNode: BlockNode, index?: number): void | never {
    if (index === undefined) {
      this.#children.push(blockNode);

      return;
    }

    /**
     * Throws error if index is out of bounds
     */
    if (index < 0 || index > this.#children.length) {
      throw new Error('Invalid index');
    }

    this.#children.splice(index, 0, blockNode);
  }

  /**
   * Removes a BlockNode from the EditorDocument at the specified index.
   * Throws an error if the index is out of bounds.
   *
   * @param index - The index of the BlockNode to remove
   */
  public removeBlock(index: number): void | never {
    if (index < 0 || index >= this.#children.length) {
      throw new Error('Invalid index');
    }

    this.#children.splice(index, 1);
  }
}
