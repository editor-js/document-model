import type { InlineToolName, InlineToolData } from '../index';
import { FormattingInlineNode } from '../index';
import type { TextInlineNodeConstructorParameters } from './types';
import type { InlineNode, InlineTreeNodeSerialized } from '../InlineNode';
import { ChildNode } from '../mixins/ChildNode';

export * from './types';

export interface TextInlineNode extends ChildNode {}

/**
 * TextInlineNode class represents a node in a tree-like structure, used to store and manipulate text content.
 */
@ChildNode
export class TextInlineNode implements InlineNode {
  /**
   * Property representing the text content of the node
   */
  public value: string;

  /**
   * Constructor for TextInlineNode class
   *
   * @param args - TextInlineNode constructor arguments.
   * @param args.value - Text content of the node.
   */
  constructor({ value = '' }: TextInlineNodeConstructorParameters = {}) {
    this.value = value;
  }

  /**
   * Returns length of the text
   */
  public get length(): number {
    return this.value.length;
  }

  /**
   * Returns serialized value of the node
   */
  public get serialized(): InlineTreeNodeSerialized {
    return {
      value: this.getText(),
      // No fragments for text node
      fragments: [],
    };
  }

  /**
   * Inserts text to specified position. By default, appends new text to the current value
   *
   * @param text - text to insert
   * @param [index] - char start index
   */
  public insertText(text: string, index = this.length): void {
    this.#validateIndex(index);

    this.value = this.value.slice(0, index) + text + this.value.slice(index);
  }

  /**
   * Remove text from specified range
   *
   * @param [start] - start char index of the range, 0 by default
   * @param [end] - end char index of the range, text length by default
   * @returns {string} removed text
   */
  public removeText(start = 0, end = this.length): string {
    this.#validateIndex(start);
    this.#validateIndex(end);

    const removedValue = this.value.slice(start, end);

    this.value = this.value.slice(0, start) + this.value.slice(end);

    if (this.length === 0) {
      this.remove();
    }

    return removedValue;
  }

  /**
   * Returns text value from the specified range
   *
   * @param [start] - start char index of the range, 0 by default
   * @param [end] - end char index of the range, text length by default
   */
  public getText(start = 0, end = this.length): string {
    if (start > end) {
      // Stryker disable next-line StringLiteral
      throw new Error(`Start index ${start} should be less or equal than end index ${end}`);
    }

    this.#validateIndex(start);
    this.#validateIndex(end);

    return this.value.slice(start, end);
  }

  /**
   * Applies inline tool for specified range
   *
   * @param tool - name of the tool to apply
   * @param start - start char index of the range
   * @param end - end char index of the range
   * @param [data] - inline tool data if applicable
   * @returns {InlineNode[]} - array of nodes after applied formatting
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): InlineNode[] {
    this.#validateIndex(start);
    this.#validateIndex(end);

    const formattingNode = new FormattingInlineNode({
      tool,
      data,
    });

    const fragments: ChildNode[] = [];

    /**
     * If start index is greater than 0, we need extract part of the text before the start index
     */
    if (start > 0) {
      fragments.push(this.#cloneContents(0, start));
    }

    /**
     * Formatting is applied to the specified range
     */
    const formattedFragment = this.#cloneContents(start, end);

    formattedFragment.appendTo(formattingNode);

    fragments.push(formattingNode);

    /**
     * If end index is less than the text length, we need to extract part of the text after the end index
     */
    if (end < this.length) {
      fragments.push(this.#cloneContents(end, this.length));
    }

    this.parent?.insertAfter(this, ...fragments);

    this.remove();

    return fragments;
  }

  /**
   * Splits current node into two nodes by the specified index
   *
   * @param index - char index where to split
   * @returns {TextInlineNode|null} - new node or null if split is not applicable
   */
  public split(index: number): TextInlineNode | null {
    if (index === 0 || index === this.length) {
      return null;
    }

    const newNode = new TextInlineNode();
    const text = this.removeText(index);

    newNode.insertText(text);

    this.parent?.insertAfter(this, newNode);

    return newNode;
  }

  /**
   * Checks if node is equal to passed node
   *
   * @param node - node to check
   */
  public isEqual(node: InlineNode): node is TextInlineNode {
    return node instanceof this.constructor;
  }

  /**
   * Merges current node with passed node
   *
   * @param node - node to merge with
   */
  public mergeWith(node: InlineNode): void {
    if (!this.isEqual(node)) {
      throw new Error('Can not merge unequal nodes');
    }

    this.value += node.value;

    node.remove();
  }

  /**
   * Normalizes node
   */
  public normalize(): void {
    /**
     * do nothing
     */
  }

  /**
   * Validates index
   *
   * @param index - char index to validate
   * @throws Error if index is out of the text length
   */
  #validateIndex(index: number): void {
    if (index < 0 || index > this.length) {
      // Stryker disable next-line StringLiteral
      throw new Error(`Index ${index} is not in valid range [0, ${this.length}]`);
    }
  }

  /**
   * Clones specified range to a new TextInlineNode
   *
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  #cloneContents(start: number, end: number): TextInlineNode {
    return new TextInlineNode({
      value: this.getText(start, end),
    });
  }
}
