import {
  FormattingNodeConstructorParameters,
  InlineToolName,
  InlineToolData
} from './types';
import type { InlineFragment, InlineNode } from '../InlineNode';
import { ParentNode } from '../mixins/ParentNode';
import { ChildNode } from '../mixins/ChildNode';
import { ParentInlineNode } from '../ParentInlineNode';

export * from './types';

/**
 * We need to extend FormattingNode interface with ChildNode and ParentNode ones to use the methods from mixins
 */
export interface FormattingNode extends ChildNode {}

/**
 * FormattingNode class represents a node in a tree-like structure, used to store and manipulate formatted text content
 */
@ParentNode
@ChildNode
export class FormattingNode extends ParentInlineNode implements InlineNode {
  /**
   * Private field representing the name of the formatting tool applied to the content
   */
  public readonly tool: InlineToolName;

  /**
   * Any additional data associated with the formatting tool
   */
  public readonly data?: InlineToolData;

  /**
   * Constructor for FormattingNode class.
   *
   * @param args - FormattingNode constructor arguments.
   * @param args.tool - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
  constructor({ tool, data }: FormattingNodeConstructorParameters) {
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
   * Returns inline fragments for subtree including current node from the specified range
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getFragments(start = 0, end = this.length): InlineFragment[] {
    const fragments = super.getFragments(start, end);

    const currentFragment: InlineFragment = {
      tool: this.tool,
      range: [start, end],
    };

    if (this.data) {
      currentFragment.data = this.data;
    }

    fragments.unshift(currentFragment);

    return fragments;
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
      tool: this.tool,
      data: this.data,
    });

    const [child, offset] = this.findChildByIndex(index);

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
      const endNode = middleNode?.split(end);

      const result: InlineNode[] = [ this ];

      if (middleNode) {
        result.push(...middleNode.children);
      }

      if (endNode) {
        result.push(endNode);
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
  public isEqual(node: InlineNode): node is FormattingNode {
    if (!(node instanceof FormattingNode)) {
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

    node.children.forEach((child) => {
      this.append(child);
    });

    node.remove();
  }
}
