import type { TextNode } from '../TextNode';
import {
  FormattingNodeConstructorParameters,
  FormattingNodeName,
  FormattingNodeData
} from './types';
import { BlockNode } from '../BlockNode';

export * from './types';

/**
 * FormattingNode class represents a node in a tree-like structure, used to store and manipulate formatted text content
 */
export class FormattingNode {
  /**
   * Private field representing the name of the formatting tool applied to the content
   */
  #name: FormattingNodeName;

  /**
   * Private field representing any additional data associated with the formatting
   */
  #data?: FormattingNodeData;

  /**
   * Private array field of FormattingNode and TextNode objects, representing any child nodes of this node
   */
  #children: (FormattingNode | TextNode)[];

  #parent: BlockNode | FormattingNode;

  /**
   * Constructor for FormattingNode class.
   *
   * @param args - FormattingNode constructor arguments.
   * @param args.name - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  constructor({ name, data, parent }: FormattingNodeConstructorParameters) {
    this.#name = name;
    this.#data = data;
    this.#children = [];
    this.#parent = parent;
  }

  /**
   *
   * @param child
   */
  public appendChild(child: TextNode | FormattingNode): void {
    this.#children.push(child);
  }

  /**
   *
   * @param parent
   */
  public appendTo(parent: FormattingNode): void {
    this.#parent = parent;

    parent.appendChild(this);
  }

  /**
   *
   * @param text
   * @param index
   */
  public insertText(text: string, index = this.length): void {
    let totalLength = 0;
    let affectedChild: FormattingNode | TextNode;

    for (const child of this.#children) {
      if (index > child.length + totalLength) {
        totalLength += child.length;

        continue;
      }

      affectedChild = child;

      break;
    }

    if (!affectedChild) {
      throw new Error(`Index ${index} seems to be out of the current node value`);
    }

    affectedChild.insertText(text, index - totalLength);
  }

  /**
   *
   * @param start
   * @param end
   */
  public getText(start = 0, end = this.length): string {
    const affectedChildren = this.#getAffectedChildren(start, end);

    /**
     * @todo check if order is guaranteed (likely not)
     */
    return Array
      .from(affectedChildren.entries())
      .reduce((t, [child, [s, e] ]) => child.getText(s, e), '');
  }

  /**
   *
   * @param name
   * @param start
   * @param end
   * @param data
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  public format(name: FormattingNodeName, start: number, end: number, data: FormattingNodeData): (TextNode | FormattingNode)[] {
    return [];
  }

  /**
   *
   */
  public get length(): number {
    return this.#children.reduce((sum, child) => sum + child.length, 0);
  }

  /**
   *
   * @param start
   * @param end
   */
  #getAffectedChildren(start: number, end: number): Map<FormattingNode | TextNode, [number, number]> {
    let totalLength = 0;
    const affectedChildren = new Map<FormattingNode | TextNode, [number, number]>();

    for (const child of this.#children) {
      const childOnTheLeft = totalLength + child.length < start;
      const childOnTheRight = totalLength > end;

      totalLength += child.length;

      if (childOnTheLeft || childOnTheRight) {
        continue;
      }

      affectedChildren.set(child, [start - totalLength - child.length, Math.min(child.length, totalLength - end)]);
    }

    return affectedChildren;
  }
}
