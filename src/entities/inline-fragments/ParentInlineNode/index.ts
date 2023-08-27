import { InlineFragment, InlineNode, InlineNodeSerialized } from '../InlineNode';
import { ParentNode, ParentNodeConstructorOptions } from '../mixins/ParentNode';
import { ChildNode } from '../mixins/ChildNode';
import type { InlineToolData, InlineToolName } from '../FormattingNode';

/**
 * We need to extend ParentInlineNode interface with ParentNode ones to use the methods from mixins
 */
export interface ParentInlineNode extends ParentNode {
}

export interface ParentInlineNodeConstructorOptions extends ParentNodeConstructorOptions {
}

/**
 * ParentInlineNode is an abstract class that contains common attributes for inline nodes that may have children. For example, RootInlineNode or FormattingNode
 */
@ParentNode
export abstract class ParentInlineNode implements InlineNode {
  /**
   * Empty constructor to support types
   *
   * @param options - constructor options to support types
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function,no-unused-vars
  constructor(options?: ParentInlineNodeConstructorOptions) {
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

    this.normalize();
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

    const removedText = this.#reduceChildrenInRange(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        return acc + child.removeText(childStart, childEnd);
      },
      ''
    );

    this.normalize();

    return removedText;
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

        const fragments = child
          .getFragments(childStart, childEnd)
          .map(fragment => ({
            ...fragment,
            range: fragment.range.map(index => index + offset) as InlineFragment['range'],
          }));

        acc.push(...fragments);

        return acc.reduce((normalized, fragment) => {
          const previousFragment = normalized[normalized.length - 1];

          /**
           * @todo compare data
           */
          if (!previousFragment || previousFragment.tool !== fragment.tool || previousFragment.range[1] !== fragment.range[0]) {
            normalized.push(fragment);

            return normalized;
          }

          previousFragment.range[1] = fragment.range[1];

          return normalized;
        }, [] as InlineFragment[]);
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

    const newNodes = this.#reduceChildrenInRange<InlineNode[]>(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        acc.push(...child.format(tool, childStart, childEnd, data));

        return acc;
      },
      []
    );

    this.normalize();

    return newNodes;
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

    const newNodes = this.#reduceChildrenInRange<InlineNode[]>(
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

    this.normalize();

    return newNodes;
  }

  /**
   * Checks if node is equal to passed node
   *
   * @param node - node to check
   */
  public isEqual(node: InlineNode): boolean {
    return node instanceof this.constructor;
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
      /**
       * Saving child length in case it would be modified by callback
       */
      const childLength = child.length;

      if (start < childLength && end > 0 && start < end) {
        result = callback(result, child, Math.max(start, 0), Math.min(childLength, end), offset);
      }

      offset += childLength;
      start -= childLength;
      end -= childLength;
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
