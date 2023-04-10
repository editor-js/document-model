import { EditorDocument } from '../EditorDocument';
import { FormattingNode } from '../FormattingNode';
import { TextNode } from '../TextNode';
import { DataNode } from '../DataNode';
import { BlockTune } from '../BlockTune';
import { BlockNodeConstructorParameters } from './types';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate content in an editor document.
 * A BlockNode can contain one or more child nodes of type TextNode, DataNode or FormattingNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode {
  /**
   * Private field representing the name of the BlockNode
   *
   * @private
   */
  #name: string;

  /**
   * Private field representing the child nodes of the BlockNode
   *
   * @private
   */
  #children: Record<string, TextNode | DataNode | FormattingNode>;

  /**
   * Private field representing the parent EditorDocument of the BlockNode
   *
   * @private
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
