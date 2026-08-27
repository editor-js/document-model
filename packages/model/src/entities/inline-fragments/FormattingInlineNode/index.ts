import type {
  FormattingInlineNodeConstructorParameters
} from './types/index.js';
import type { InlineToolName, InlineToolData, InlineFragment } from '@editorjs/model-types';
import type { InlineNode } from '../InlineNode/index.js';
import { ParentNode } from '../mixins/ParentNode/index.js';
import { ChildNode } from '../mixins/ChildNode/index.js';
import { ParentInlineNode } from '../ParentInlineNode/index.js';
import { isSameInlineData } from '../../../utils/index.js';

export type * from './types/index.js';

/**
 * We need to extend FormattingInlineNode interface with ChildNode and ParentNode ones to use the methods from mixins
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
   * Any additional data associated with the formatting tool.
   * Kept in a private field so it can be replaced on re-formatting while staying read-only to the outside.
   */
  #data?: InlineToolData;

  /**
   * Any additional data associated with the formatting tool
   */
  public get data(): InlineToolData | undefined {
    return this.#data;
  }

  /**
   * Constructor for FormattingInlineNode class.
   * @param args - FormattingInlineNode constructor arguments.
   * @param args.tool - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
  constructor({ tool, data }: FormattingInlineNodeConstructorParameters) {
    super();

    this.tool = tool;
    this.#data = data;
  }

  /**
   * Removes text from the specified range. If there is no text left in a node, removes a node from a parent.
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @returns removed text
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
   * @param index - char index where to split the node
   * @returns new node
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
   * @param tool - name of inline tool to apply
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): InlineNode[] {
    if (tool === this.tool) {
      /**
       * Re-applying the same tool with the same data is a no-op
       */
      if (isSameInlineData(data, this.#data)) {
        return [];
      }

      /**
       * Re-applying the same tool with different data replaces the data over the passed range.
       * Split the node so only the affected range gets the new data, then update that segment.
       */
      return this.#replaceData(start, end, data);
    }

    return super.format(tool, start, end, data);
  }

  /**
   * Replaces this node's data over the specified range, splitting the node when the range does
   * not cover it fully so the surrounding parts keep their original data.
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param [data] - new inline tool data to apply
   */
  #replaceData(start: number, end: number, data?: InlineToolData): InlineNode[] {
    /**
     * Range covers the whole node — just swap the data in place
     */
    if (start === 0 && end === this.length) {
      this.#data = data;

      return [this];
    }

    const middleNode = this.split(start);
    const result: FormattingInlineNode[] = [];

    /**
     * If start > 0, `split` produced a node covering [start, length). Split it again at `end`
     * so `middleNode` is exactly the affected range, and the remainder keeps the old data.
     */
    if (middleNode) {
      const endNode = middleNode.split(end - this.length);

      middleNode.#data = data;

      result.push(this, middleNode);

      if (endNode) {
        result.push(endNode);
      }
    /**
     * If start === 0, split at `end` so `this` becomes the affected range and the tail keeps the old data.
     */
    } else {
      const endNode = this.split(end);

      this.#data = data;

      result.push(this);

      if (endNode) {
        result.push(endNode);
      }
    }

    return result;
  }

  /**
   * Removes formatting from the text for a specified inline tool in the specified range
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
     * Fragments with different data must stay separate so normalization does not drop or resurrect stale data
     */
    return isSameInlineData(this.#data, node.#data);
  }

  /**
   * Merges current node with passed node
   * @param node - node to merge with
   */
  public mergeWith(node: InlineNode): void {
    if (!this.isEqual(node)) {
      throw new Error('Can not merge unequal nodes');
    }

    /**
     * `isEqual` guarantees the data is equal, so there is nothing to reconcile — just move the children over
     */
    Array.from(node.children).forEach((child) => {
      this.append(child);
    });

    node.remove();
  }
}
