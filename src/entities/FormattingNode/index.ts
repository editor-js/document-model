import {
  FormattingNodeConstructorParameters,
  InlineToolName,
  InlineToolData
} from './types';
import { ChildNode, InlineFragment, InlineNode, InlineNodeSerialized, ParentNode } from '../interfaces';

export * from './types';

/**
 * We need to extend FormattingNode interface with ChildNode and ParentNode ones to use the methods from mixins
 */
export interface FormattingNode extends ChildNode, ParentNode {}

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
   * ny additional data associated with the formatting tool
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
   * @param [index] - char index where to insert text
   */
  public insertText(text: string, index = this.length): void {
    const [child, offset] = this.#findChildByIndex(index);

    child?.insertText(text, index - offset);
  }

  /**
   * Removes text form the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @returns {string} removed text
   */
  public removeText(start = 0, end = this.length): string {
    const result = this.#reduceChildrenInRange(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        return acc + child.removeText(childStart, childEnd);
      },
      ''
    );

    if (this.length === 0) {
      this.remove();
    }

    return result;
  }

  /**
   * Returns text from the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getText(start = 0, end = this.length): string {
    return this.#reduceChildrenInRange(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        return acc + child.getText(childStart, childEnd);
      },
      ''
    );
  }

  /**
   * Returns inline fragments for subtree including current node from the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getFragments(start = 0, end = this.length): InlineFragment[] {
    return this.#reduceChildrenInRange<InlineFragment[]>(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        /**
         * If child is not a FormattingNode, it doesn't include any fragments. So we skip it.
         */
        if (!(child instanceof FormattingNode)) {
          return acc;
        }

        acc.push(...child.getFragments(childStart, childEnd));

        return acc;
      },
      [ {
        tool: this.#tool,
        data: this.#data,
        range: [start, end],
      } ]
    );
  }

  /**
   * Splits current node by the specified index
   *
   * @param index - char index where to split the node
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

    const [child, offset] = this.#findChildByIndex(index);

    if (!child) {
      return null;
    }

    // Have to save length as it is changed after split
    const childLength = child.length;

    const splitNode = child.split(index - offset);
    let midNodeIndex = this.children.indexOf(child);

    /**
     * If node is split or if node is not split but index equals to child length, we should split children from the next node
     */
    if (splitNode || (index - offset === childLength)) {
      midNodeIndex += 1;
    }

    newNode.append(...this.children.slice(midNodeIndex));

    this.parent?.insertAfter(this, newNode);

    return newNode;
  }

  /**
   * Applies formatting to the text with specified inline tool in the specified range
   *
   * @param tool - name of inline tool to apply
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): InlineNode[] {
    /**
     * In case current tool is the same as new one, do nothing
     */
    if (tool === this.#tool) {
      return [];
    }


    return this.#reduceChildrenInRange<InlineNode[]>(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        acc.push(...child.format(tool, childStart, childEnd, data));

        return acc;
      },
      []
    );
  }

  /**
   * Iterates through children in range and calls callback for each
   *
   * @param start - range start char index
   * @param end - range end char index
   * @param callback - callback to apply on children
   * @param initialValue - initial accumulator value
   * @private
   */
  #reduceChildrenInRange<Acc>(
    start: number,
    end: number,
    callback: (acc: Acc, child: InlineNode, start: number, end: number) => Acc,
    initialValue: Acc
  ): Acc {
    let result = initialValue;

    for (const child of this.children) {
      if (start < child.length && end > 0 && start < end) {
        result = callback(result, child, Math.max(start, 0), Math.min(child.length, end));
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }

  /**
   * Returns child by passed text index
   *
   * @param index - char index
   * @private
   */
  #findChildByIndex(index: number): [child: InlineNode & ChildNode | null, offset: number] {
    let totalLength = 0;

    for (const child of this.children) {
      if (index <= child.length + totalLength) {
        return [child, totalLength];
      }

      totalLength += child.length;
    }

    return [null, totalLength];
  }
}
