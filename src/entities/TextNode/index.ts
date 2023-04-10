import { BlockNode } from '../BlockNode';
import { FormattingNode } from '../FormattingNode';
import { TextNodeConstructorParameters } from './types';

/**
 * TextNode class represents a node in a tree-like structure, used to store and manipulate text content.
 */
export class TextNode {
  /**
   * Private field representing the text content of the node
   *
   * @private
   */
  #value: string;

  /**
   * Private field representing the length of the text content
   *
   * @private
   */
  #length: number;

  /**
   * Private array field of FormattingNode objects
   *
   * @private
   */
  #children: FormattingNode[];

  /**
   * Private field that can be either a BlockNode or a FormattingNode, representing the parent node of the TextNode
   *
   * @private
   */
  #parent: BlockNode | FormattingNode;

  /**
   * Constructor for TextNode class
   *
   * @param args - TextNode constructor arguments.
   * @param args.value - Text content of the node.
   * @param args.children - Array of child nodes.
   * @param args.parent - A parent of TextNode.
   */
  constructor({ value, children = [], parent }: TextNodeConstructorParameters) {
    this.#value = value;
    this.#length = value.length;
    this.#children = children;
    this.#parent = parent;
  }
}
