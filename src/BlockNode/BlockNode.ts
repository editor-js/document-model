import { EditorDocument } from '../EditorDocument';
import { FormattingNode } from '../FormattingNode';
import { TextNode } from '../TextNode';
import { ValueNode } from '../ValueNode';
import { BlockTune } from '../BlockTune';
import { BlockNodeConstructorParameters } from './types';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type TextNode, ValueNode or FormattingNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode {
  /**
   * Field representing a name of the Tool created this Block
   *
   * @private
   */
  #name: string;

  /**
   * Field representing the content of the Block
   *
   * @private
   */
  #children: Record<string, TextNode | ValueNode | FormattingNode>;

  /**
   * Field representing the parent EditorDocument of the BlockNode
   */
  #parent: EditorDocument;

  /**
   * Private field representing the BlockTunes associated with the BlockNode
   *
   * @private
   */
  #tunes: Record<string, BlockTune>;

  /**
   * Constructor for BlockNode class.
   *
   * @param args - TextNode constructor arguments.
   * @param args.name - The name of the BlockNode.
   * @param args.children - The child nodes of the BlockNode.
   * @param args.parent - The parent EditorDocument of the BlockNode.
   * @param args.tunes - The BlockTunes associated with the BlockNode.
   */
  constructor({ name, children, parent, tunes }: BlockNodeConstructorParameters) {
    this.#name = name;
    this.#children = children;
    this.#parent = parent;
    this.#tunes = tunes;
  }
}
