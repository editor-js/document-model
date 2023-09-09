import { ChildNode } from '../../mixins/ChildNode';
import { InlineNode } from '../../InlineNode';
import { TextInlineNodeConstructorParameters } from '../types';

export interface TextInlineNode extends ChildNode {}

/**
 * Mock for TextInlineNode class
 */
@ChildNode
export class TextInlineNode implements InlineNode {
  /** Mock value */
  public value;

  /**
   * Mock constructor
   *
   * @param args - constructor params
   * @param [args.value] - TextNode value
   */
  constructor({ value = '' }: TextInlineNodeConstructorParameters) {
    this.value = value;
  }

  /**
   * Mock method
   */
  public getText(): string {
    return '';
  }

  /**
   * Mock method
   */
  public removeText(): string {
    return '';
  }

  /**
   * Mock method
   *
   * @param text - text to insert
   */
  public insertText(text: string): void {
    this.value += text;
  }

  /**
   * Mock method
   */
  public isEqual(): boolean {
    return false;
  }

  /**
   * Mock method
   */
  public get length(): number {
    return this.value.length;
  }

  /**
   * Mock method
   */
  public normalize(): void {
    return;
  }

  /**
   * Mock method
   *
   * @param index - index where to split the node
   */
  public split(index: number): InlineNode | null {
    if (index === 0 || index === this.length) {
      return null;
    }

    const newNode = new TextInlineNode({ value: this.value.slice(index) });

    this.value = this.value.slice(0, index);

    this.parent?.insertAfter(this, newNode);

    return newNode;
  }

  /**
   * Mock method
   */
  public format(): [] {
    return [];
  }
}
