import type {
  FormattingInlineNodeConstructorParameters,
  InlineToolName,
  InlineToolData
} from './types';
import type { InlineFragment, InlineNode } from '../InlineNode';
import { ParentNode } from '../mixins/ParentNode/index.js';
import { ChildNode } from '../mixins/ChildNode/index.js';
import { ParentInlineNode } from '../ParentInlineNode/index.js';

export * from './types/index.js';

/**
 * We need to extend FormattingInlineNode interface with ChildNode and ParentNode ones to use the methods from mixins
 */
export interface FormattingInlineNode extends ChildNode {}

/**
 * FormattingInlineNode class represents a node in a tree-like structure, used to store and manipulate formatted text content
 */
@ParentNode
@ChildNode
export class FormattingInlineNode extends ParentInlineNode implements InlineNode {
  /**
   * Property representing the name of the formatting tool applied to the content
   */
  public readonly tool: InlineToolName;

  /**
   * Any additional data associated with the formatting tool
   */
  public readonly data?: InlineToolData;

  /**
   * Constructor for FormattingInlineNode class.
   *
   * @param args - FormattingInlineNode constructor arguments.
   * @param args.tool - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
  constructor({ tool, data }: FormattingInlineNodeConstructorParameters) {
    super();

    this.tool = tool;
    this.data = data;
  }

  /**
   * Removes text from the specified range. If there is no text left in a node, removes a node from a parent.
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @returns {string} removed text
   */
  public removeText(start = 0, end = this.length): string {
    const result = super.removeText(start, end);

    if (this.length === 0) {
      this.remove();
    }

    return result;
  }

  /**
   * Returns inline fragments for node from the specified character range
   * Always return full fragments even if one is not fully covered by the passed range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getFragments(start = 0, end = this.length): InlineFragment[] {
    const fragments = super.getFragments(start, end);

    const currentFragment: InlineFragment = {
      tool: this.tool,
      range: [0, this.length],
    };

    if (this.data) {
      currentFragment.data = this.data;
    }

    /**
     * Current node is not processed in super.getFragments, so we need to add it manually at the beginning
     */
    fragments.unshift(currentFragment);

    return fragments;
  }

  /**
   * Splits current node by the specified index
   *
   * @param index - char index where to split the node
   * @returns {FormattingInlineNode | null} new node
   */
  public split(index: number): FormattingInlineNode | null {
    this.validateIndex(index);

    if (index === 0 || index === this.length) {
      return null;
    }

    const newNode = new FormattingInlineNode({
      tool: this.tool,
      data: this.data,
    });

    const [child, offset] = this.findChildByIndex(index);

    child.split(index - offset);

    /**
     * We need to add 1 to the index to get the index of the new node appended to the parent after child split
     */
    const midNodeIndex = this.children.indexOf(child) + 1;


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
     *
     * @todo Compare data as well
     */
    if (tool === this.tool) {
      return [];
    }


    return super.format(tool, start, end, data);
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
    if (this.tool === tool) {
      const middleNode = this.split(start);
      const endNode = middleNode ? middleNode.split(end - this.length) : this.split(end);

      const result: ChildNode[] = [];

      /**
       * If start > 0, then there is a middle node, so we'll need to append its children to the parent
       */
      if (middleNode) {
        result.push(this, ...middleNode.children);
      /**
       * Else we'll need to append current nodes children to the parent
       */
      } else {
        result.push(...this.children);
      }

      /**
       * If end < this.length, we just append it to the parent
       */
      if (endNode) {
        result.push(endNode);
      }

      this.parent?.insertAfter(this, ...result);

      if (middleNode) {
        middleNode.remove();
      } else {
        this.remove();
      }

      return result;
    }

    return super.unformat(tool, start, end);
  }

  /**
   * Checks if node is equal to passed node
   *
   * @param node - node to check
   */
  public isEqual(node: InlineNode): node is FormattingInlineNode {
    if (!(node instanceof FormattingInlineNode)) {
      return false;
    }

    if (this.tool !== node.tool) {
      return false;
    }

    /**
     * @todo check data equality
     */

    return true;
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

    /**
     * @todo merge data
     */
    Array.from(node.children).forEach((child) => {
      console.log('child to append', child)
      this.append(child);
    });

    node.remove();
  }
}
