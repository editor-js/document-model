import {
  FormattingNodeConstructorParameters,
  InlineToolName,
  InlineToolData
} from './types';
import { ChildNode, InlineFragment, InlineNode, InlineNodeSerialized, ParentNode } from '../interfaces';

export * from './types';

export interface FormattingNode extends ChildNode, ParentNode {
  children: (InlineNode & ChildNode)[]
}

/**
 * FormattingNode class represents a node in a tree-like structure, used to store and manipulate formatted text content
 */
@ParentNode
@ChildNode
export class FormattingNode implements InlineNode {
  /**
   * Private field representing the name of the formatting tool applied to the content
   */
  #tool: InlineToolName;

  /**
   * Private field representing any additional data associated with the formatting tool
   */
  #data?: InlineToolData;

  /**
   * Constructor for FormattingNode class.
   *
   * @param args - FormattingNode constructor arguments.
   * @param args.tool - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  constructor({ tool, data }: FormattingNodeConstructorParameters) {
    this.#tool = tool;
    this.#data = data;
  }

  /**
   * Returns text value length of current node (including subtree)
   */
  public get length(): number {
    return this.children.reduce((sum, child) => sum + child.length, 0);
  }

  /**
   * Returns serialized value of the node: text and formatting fragments
   */
  public get serialized(): InlineNodeSerialized {
    return {
      text: this.getText(),
      fragments: this.getFragments(),
    };
  }

  /**
   * Inserts text to the specified index, by default appends text to the end of the current value
   *
   * @param text - text to insert
   * @param [index] - index where to insert text
   */
  public insertText(text: string, index = this.length): void {
    let totalLength = 0;

    for (const child of this.children) {
      if (index <= child.length + totalLength) {
        child.insertText(text, index - totalLength);

        return;
      }

      totalLength += child.length;
    }
  }

  /**
   * Removes text form the specified range
   *
   * @param [start] - start index of the range, by default 0
   * @param [end] - end index of the range, by default length of the text value
   *
   * @returns {string} removed text
   */
  public removeText(start = 0, end = this.length): string {
    let result = '';

    for (const child of this.children) {
      if (start < child.length && end > 0 && start < end) {
        result += child.removeText(Math.max(start, 0), Math.min(child.length, end));
      }

      start -= child.length;
      end -= child.length;
    }

    if (this.length === 0) {
      this.remove();
    }

    return result;
  }

  /**
   * Returns text from the specified range
   *
   * @param [start] - start index of the range, by default 0
   * @param [end] - end index of the range, by default length of the text value
   */
  public getText(start = 0, end = this.length): string {
    let result = '';

    for (const child of this.children) {
      if (start < child.length && end > 0 && start < end) {
        result += child.getText(Math.max(start, 0), Math.min(child.length, end));
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }

  /**
   * Returns inline fragments for subtree including current node from the specified range
   *
   * @param [start] - start index of the range, by default 0
   * @param [end] - end index of the range, by default length of the text value
   */
  public getFragments(start = 0, end = this.length): InlineFragment[] {
    const result: InlineFragment[] = [ {
      tool: this.#tool,
      data: this.#data,
      range: [start, end],
    } ];

    for (const child of this.children) {
      if (!(child instanceof FormattingNode)) {
        continue;
      }

      if (start < child.length && end > 0 && start < end) {
        result.push(...child.getFragments(start, end));
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }

  /**
   * Splits current node by the specified index
   *
   * @param index - index where to split the node
   *
   * @returns {FormattingNode | null} new node
   */
  public split(index: number): FormattingNode | null {
    if (index === 0 || index === this.length) {
      return null;
    }

    const newNode = new FormattingNode({
      tool: this.#tool,
      data: this.#data,
    });

    let totalLength = 0;
    let midNodeIndex = 0;

    for (const [i, child] of this.children.entries()) {
      if (index <= child.length + totalLength) {
        const splitNode = child.split(index - totalLength);

        if (!splitNode && index === child.length) {
          midNodeIndex = i;

          break;
        }

        midNodeIndex = i + 1;
        break;
      }

      totalLength += child.length;
    }

    newNode.append(...this.children.slice(midNodeIndex));

    this.parent?.insertAfter(this, newNode);

    return newNode;
  }

  /**
   * Applies formatting to the text with specified inline tool in the specified range
   *
   * @param tool - name of inline tool to apply
   * @param start - start of the range
   * @param end - end of the range
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): InlineNode[] {
    /**
     * In case current tool is the same as new one, do nothing
     */
    if (tool === this.#tool) {
      return [];
    }

    const result = [];

    for (const child of this.children) {
      if (start < child.length && end > 0 && start < end) {
        result.push(...child.format(tool, Math.max(start, 0), Math.min(end, child.length), data));
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }
}
