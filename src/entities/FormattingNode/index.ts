import { TextNode } from '../TextNode';
import { FormattingNodeConstructorParameters, FormattingNodeName, createFormattingNodeName } from './types';

/**
 * FormattingNode class represents a node in a tree-like structure, used to store and manipulate formatted text content
 */
export class FormattingNode {
  /**
   * Private field representing the name of the formatting tool applied to the content
   */
  #name: FormattingNodeName;

  /**
   * Private field representing any additional data associated with the formatting
   */
  #data: Record<string, unknown>;

  /**
   * Private field representing the length of the text content stored as a children in this node
   */
  #length: number;

  /**
   * Private array field of FormattingNode and TextNode objects, representing any child nodes of this node
   */
  #children: (FormattingNode | TextNode)[];

  /**
   * Constructor for FormattingNode class.
   *
   * @param args - FormattingNode constructor arguments.
   * @param args.name - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  constructor({ name, data }: FormattingNodeConstructorParameters) {
    this.#name = name;
    this.#data = data;
    this.#length = 0;
    this.#children = [];
  }

  /**
   * Returns serialized object representing the FormattingNode
   *
   * @todo implement
   */
  public get serialized(): void {
    return;
  }
}

export {
  FormattingNodeName,
  createFormattingNodeName
};
