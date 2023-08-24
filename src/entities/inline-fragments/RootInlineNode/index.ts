import { InlineFragment, InlineNode, InlineNodeSerialized } from '../InlineNode';
import { ParentNode, ParentNodeConstructorOptions } from '../mixins/ParentNode';
import { ChildNode } from '../mixins/ChildNode';
import type { InlineToolData, InlineToolName } from '../FormattingNode';

/**
 * We need to extend RootInlineNode interface with ParentNode ones to use the methods from mixins
 */
export interface RootInlineNode extends ParentNode {
}

export interface RootInlineNodeConstructorOptions extends ParentNodeConstructorOptions {}

/**
 * RootInlineNode class represents a root node in a tree-like structure to have a single access point to the tree
 */
@ParentNode
export class RootInlineNode implements InlineNode {
  /**
   * Empty constructor to support types
   *
   * @param options - ParentNode construtor options to support types
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function,no-unused-vars
  constructor(options?: RootInlineNodeConstructorOptions) {}

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
    this.#validateIndex(index);

    if (this.length === 0) {
      /**
       * We need to resolve circular dependency by require
       */
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TextNode } = require('../TextNode');

      const textNode = new TextNode();

      this.append(textNode);
    }

    const [child, offset] = this.findChildByIndex(index);

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
    this.#validateIndex(start);
    this.#validateIndex(end);

    return this.#reduceChildrenInRange(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        return acc + child.removeText(childStart, childEnd);
      },
      ''
    );
  }

  /**
   * Returns text from the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getText(start = 0, end = this.length): string {
    this.#validateIndex(start);
    this.#validateIndex(end);

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
    this.#validateIndex(start);
    this.#validateIndex(end);

    return this.#reduceChildrenInRange<InlineFragment[]>(
      start,
      end,
      (acc, child, childStart, childEnd, offset) => {
        /**
         * If child is not a FormattingNode, it doesn't include any fragments. So we skip it.
         */
        if (typeof child.getFragments !== 'function') {
          return acc;
        }

        const fragments = child.getFragments(childStart, childEnd);

        acc.push(...fragments.map(fragment => ({
          ...fragment,
          range: fragment.range.map(index => index + offset) as InlineFragment['range'],
        })));

        return acc;
      },
      []
    );
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
    this.#validateIndex(start);
    this.#validateIndex(end);

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
   * Removes formatting from the text for a specified inline tool in the specified range
   *
   * @param tool - name of inline tool to remove
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @todo Possibly pass data or some InlineTool identifier to relevant only required fragments
   */
  public unformat(tool: InlineToolName, start: number, end: number): InlineNode[] {
    this.#validateIndex(start);
    this.#validateIndex(end);

    return this.#reduceChildrenInRange<InlineNode[]>(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        /**
         * TextNodes don't have unformat method, so skip them
         */
        if (typeof child.unformat !== 'function') {
          return acc;
        }

        acc.push(...child.unformat(tool, childStart, childEnd));

        return acc;
      },
      []
    );
  }

  /**
   * Returns child by passed text index
   *
   * @param index - char index
   * @private
   */
  protected findChildByIndex(index: number): [child: InlineNode & ChildNode | null, offset: number] {
    let totalLength = 0;

    for (const child of this.children) {
      if (index <= child.length + totalLength) {
        return [child, totalLength];
      }

      totalLength += child.length;
    }

    return [null, totalLength];
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
    callback: (acc: Acc, child: InlineNode, start: number, end: number, offset: number) => Acc,
    initialValue: Acc
  ): Acc {
    let result = initialValue;

    /**
     * Make a copy of the children array in case callback would modify it
     */
    const children = Array.from(this.children);

    let offset = 0;

    for (const child of children) {
      if (start < child.length && end > 0 && start < end) {
        result = callback(result, child, Math.max(start, 0), Math.min(child.length, end), offset);
      }

      offset += child.length;
      start -= child.length;
      end -= child.length;
    }

    return result;
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
}
