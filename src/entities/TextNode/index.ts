import { BlockNode } from '../BlockNode';
import { FormattingNode, FormattingNodeName, FormattingNodeData } from '../FormattingNode';
import { TextNodeConstructorParameters } from './types';

export * from './types';

/**
 * TextNode class represents a node in a tree-like structure, used to store and manipulate text content.
 */
export class TextNode {
  /**
   * Private field representing the text content of the node
   */
  #value: string;


  /**
   * Private field that can be either a BlockNode or a FormattingNode, representing the parent node of the TextNode
   */
  #parent: BlockNode | FormattingNode;

  /**
   * Constructor for TextNode class
   *
   * @param args - TextNode constructor arguments.
   * @param args.value - Text content of the node.
   * @param args.parent - A parent of TextNode.
   */
  constructor({ value = '', parent }: TextNodeConstructorParameters) {
    this.#value = value;
    this.#parent = parent;
  }

  /**
   *
   */
  public get length(): number {
    return this.#value.length;
  }

  /**
   *
   * @param text
   * @param index
   */
  public insertText(text: string, index = this.length): void {
    this.#validateIndex(index);

    this.#value = this.#value.slice(0, index) + text + this.#value.slice(index);
  }

  /**
   *
   * @param start
   * @param end
   */
  public getText(start = 0, end = this.length): string {
    if (start > end) {
      throw new Error(`Start index ${start} should be less or equal than end index ${end}`);
    }

    this.#validateIndex(start);
    this.#validateIndex(end);

    return this.#value.slice(start, end);
  }

  /**
   *
   * @param name
   * @param start
   * @param end
   * @param data
   */
  public format(name: FormattingNodeName, start: number, end: number, data?: FormattingNodeData): (TextNode | FormattingNode)[] {
    this.#validateIndex(start);
    this.#validateIndex(end);

    const formattingNode = new FormattingNode({ name,
      data,
      parent: this.#parent });
    const fragments: (TextNode | FormattingNode)[] = [];

    if (start > 0) {
      fragments.push(this.#cloneFragment(0, start));
    }

    const formattedFragment = this.#cloneFragment(start, end);

    formattedFragment.appendTo(formattingNode);

    fragments.push(formattingNode);

    if (end < this.length) {
      fragments.push(this.#cloneFragment(end, this.length));
    }

    return fragments;
  }

  /**
   *
   * @param parent
   */
  public appendTo(parent: FormattingNode): void {
    this.#parent = parent;

    parent.appendChild(this);
  }

  /**
   *
   * @param index
   */
  #validateIndex(index: number): void {
    if (index < 0 || index > this.length) {
      throw new Error(`Index ${index} is not in valid range [0, ${this.length}]`);
    }
  }

  /**
   *
   * @param start
   * @param end
   */
  #cloneFragment(start: number, end: number): TextNode {
    return new TextNode({
      value: this.getText(start, end),
      parent: this.#parent,
    });
  }
}
