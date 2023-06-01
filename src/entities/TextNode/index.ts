import { FormattingNode, FormattingNodeName, FormattingNodeData } from '../FormattingNode';
import { TextNodeConstructorParameters } from './types';
import { ChildNode, InlineNode, InlineNodeSerialized } from '../interfaces';

export * from './types';

export interface TextNode extends ChildNode {}

/**
 * TextNode class represents a node in a tree-like structure, used to store and manipulate text content.
 */
@ChildNode
export class TextNode implements InlineNode {
  /**
   * Private field representing the text content of the node
   */
  #value: string;


  /**
   * Private field that can be either a BlockNode or a FormattingNode, representing the parent node of the TextNode
   */
  #parent?: FormattingNode;

  /**
   * Constructor for TextNode class
   *
   * @param args - TextNode constructor arguments.
   * @param args.value - Text content of the node.
   */
  constructor({ value = '' }: TextNodeConstructorParameters = {}) {
    this.#value = value;
  }

  /**
   *
   */
  public get length(): number {
    return this.#value.length;
  }

  /**
   *
   */
  public get serialized(): InlineNodeSerialized {
    return {
      text: this.getText(),
      fragments: [],
    };
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
  public format(name: FormattingNodeName, start: number, end: number, data?: FormattingNodeData): InlineNode[] {
    this.#validateIndex(start);
    this.#validateIndex(end);

    const formattingNode = new FormattingNode({
      name,
      data,
    });

    const fragments: (InlineNode & ChildNode)[] = [];

    if (start > 0) {
      fragments.push(this.#cloneFragment(0, start));
    }

    const formattedFragment = this.#cloneFragment(start, end);

    formattedFragment.appendTo(formattingNode);

    fragments.push(formattingNode);

    if (end < this.length) {
      fragments.push(this.#cloneFragment(end, this.length));
    }

    this.remove();

    this.#parent?.append(...fragments);

    return fragments as InlineNode[];
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
    });
  }
}
