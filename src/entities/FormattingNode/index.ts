import {
  FormattingNodeConstructorParameters,
  FormattingNodeName,
  FormattingNodeData
} from './types';
import { ChildNode, InlineFragment, InlineNode, InlineNodeSerialized, ParentNode } from '../interfaces';

export * from './types';

export interface FormattingNode extends ChildNode, ParentNode {
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
  #name: FormattingNodeName;

  /**
   * Private field representing any additional data associated with the formatting
   */
  #data?: FormattingNodeData;

  /**
   * Private array field of FormattingNode and TextNode objects, representing any child nodes of this node
   */
  #children: InlineNode[] = [];

  /**
   * Private field that can be either a BlockNode or a FormattingNode, representing the parent node of the TextNode
   */
  #parent?: FormattingNode;


  /**
   * Constructor for FormattingNode class.
   *
   * @param args - FormattingNode constructor arguments.
   * @param args.name - The name of the formatting tool applied to the content.
   * @param args.data - Any additional data associated with the formatting.
   */
  constructor({ name, data }: FormattingNodeConstructorParameters) {
    this.#name = name;
    this.#data = data;
  }

  /**
   *
   */
  public get length(): number {
    return this.#children.reduce((sum, child) => sum + child.length, 0);
  }

  /**
   *
   */
  public get serialized(): InlineNodeSerialized {
    return {
      text: this.getText(),
      fragments: this.getFragments(),
    };
  }

  /**
   *
   * @param text
   * @param index
   */
  public insertText(text: string, index = this.length): void {
    let totalLength = 0;

    for (const child of this.#children) {
      if (index <= child.length + totalLength) {
        child.insertText(text, index);

        return;
      }

      totalLength += child.length;
    }
  }

  /**
   *
   * @param start
   * @param end
   */
  public getText(start = 0, end = this.length): string {
    let result = '';

    for (const child of this.#children) {
      if (start < child.length && end > 0 && start < end) {
        result += child.getText(start, end);
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }

  /**
   *
   * @param start
   * @param end
   */
  public getFragments(start = 0, end = this.length): InlineFragment[] {
    const result: InlineFragment[] = [ {
      name: this.#name,
      data: this.#data,
      range: [start, end],
    } ];

    for (const child of this.#children) {
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
   *
   * @param name
   * @param start
   * @param end
   * @param data
   */
  public format(name: FormattingNodeName, start: number, end: number, data: FormattingNodeData): InlineNode[] {
    const result = [];

    for (const child of this.#children) {
      if (start < child.length && end > 0 && start < end) {
        result.push(...child.format(name, Math.max(start, 0), Math.min(end, child.length), data));
      }

      start -= child.length;
      end -= child.length;
    }

    return result;
  }
}
