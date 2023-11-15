import type { InlineFragment, InlineNode, InlineTreeNodeSerialized } from '../InlineNode';
import type { ParentNodeConstructorOptions } from '../mixins/ParentNode';
import { ParentNode } from '../mixins/ParentNode/index.js';
import type { ChildNode } from '../mixins/ChildNode';
import type { InlineToolData, InlineToolName } from '../FormattingInlineNode';
import { TextInlineNode } from '../index.js';
import { EventBus } from '../../../utils/EventBus/EventBus.js';
import {
  TextAddedEvent,
  TextRemovedEvent,
  TextFormattedEvent,
  TextUnformattedEvent
} from '../../../utils/EventBus/events/index.js';

/**
 * We need to extend ParentInlineNode interface with ParentNode ones to use the methods from mixins
 */
export interface ParentInlineNode extends ParentNode {
}

export interface ParentInlineNodeConstructorOptions extends ParentNodeConstructorOptions {
}

/**
 * ParentInlineNode is a class that contains common attributes for inline nodes that may have children. For example, TextInlineNode or FormattingInlineNode
 */
@ParentNode
export class ParentInlineNode extends EventBus implements InlineNode {
  /**
   * Empty constructor to support types
   *
   * @param options - constructor options to support types
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function,no-unused-vars
  constructor(options?: ParentInlineNodeConstructorOptions) {
    super();
  }

  /**
   * Returns serialized value of the node: text and formatting fragments
   */
  public get serialized(): InlineTreeNodeSerialized {
    return {
      value: this.getText(),
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
    this.validateIndex(index);

    if (this.length === 0) {
      const textNode = new TextInlineNode();

      this.append(textNode);
    }

    const [child, offset] = this.findChildByIndex(index);

    child.insertText(text, index - offset);

    this.normalize();

    this.dispatchEvent(new TextAddedEvent([[index, index + text.length]], text));
  }

  /**
   * Removes text form the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @returns {string} removed text
   */
  public removeText(start = 0, end = this.length): string {
    this.validateRange(start, end);

    const removedText = this.#reduceChildrenInRange(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        return acc + child.removeText(childStart, childEnd);
      },
      ''
    );

    this.normalize();

    this.dispatchEvent(new TextRemovedEvent([[start, end]], removedText));

    return removedText;
  }

  /**
   * Returns text from the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getText(start = 0, end = this.length): string {
    this.validateRange(start, end);

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
    this.validateRange(start, end);

    return this.#reduceChildrenInRange<InlineFragment[]>(
      start,
      end,
      (acc, child, childStart, childEnd, offset) => {
        /**
         * If child is not a FormattingInlineNode, it doesn't include any fragments. So we skip it.
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
          if (previousFragment === undefined || previousFragment.tool !== fragment.tool || previousFragment.range[1] !== fragment.range[0]) {
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
    this.validateRange(start, end);

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

    this.dispatchEvent(
      new TextFormattedEvent(
        [[start, end]],
        {
          tool,
          data,
        }
      )
    );

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
    this.validateRange(start, end);

    const newNodes = this.#reduceChildrenInRange<InlineNode[]>(
      start,
      end,
      (acc, child, childStart, childEnd) => {
        /**
         * TextInlineNodes don't have unformat method, so skip them
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

    this.dispatchEvent(new TextUnformattedEvent([[start, end]], { tool }));

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
  protected findChildByIndex(index: number): [child: InlineNode & ChildNode, offset: number] {
    let totalLength = 0;

    for (const child of this.children) {
      if (index <= child.length + totalLength) {
        return [child, totalLength];
      }

      totalLength += child.length;
    }


    /**
     * This is unreachable code in normal operation, but we need it to have consistent types
     */
    /* Stryker disable next-line StringLiteral */
    /* istanbul ignore next */
    throw new Error(`Child is not found by ${index} index`);
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
   * Validates if range has valid start and end points
   *
   * @param start - range start
   * @param end - range end
   * @throws Error if range is invalid
   */
  protected validateRange(start: number, end: number): void {
    this.validateIndex(start);
    this.validateIndex(end);

    if (end < start) {
      throw new Error(`The end of range must be greater or equal than the start: [${start}, ${end}]`);
    }
  }


  /**
   * Validates index
   *
   * @param index - char index to validate
   * @throws Error if index is out of the text length
   */
  protected validateIndex(index: number): void {
    if (index < 0 || index > this.length) {
      // Stryker disable next-line StringLiteral
      throw new Error(`Index ${index} is not in valid range [0, ${this.length}]`);
    }
  }
}
