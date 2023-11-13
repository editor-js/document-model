import { ParentNode } from '../../mixins/ParentNode';
import { ChildNode } from '../../mixins/ChildNode';
import type { InlineFragment } from '../../InlineNode';

export interface FormattingInlineNode extends ParentNode, ChildNode {}

/**
 * Mock for FormattingInlineNode class
 */
@ParentNode
@ChildNode
export class FormattingInlineNode {
  /**
   * Method mock
   */
  public get length(): number {
    return this.children.reduce((sum, child) => sum + child.length, 0);
  }

  /**
   * Mock method
   */
  public getText(): string {
    return '';
  }

  /**
   * Mock method
   */
  public insertText(): void {
    return;
  }

  /**
   * Mock method
   */
  public removeText(): string {
    return '';
  }

  /**
   * Mock method
   */
  public getFragments(): InlineFragment[] {
    return [];
  }

  /**
   * Mock method
   */
  public isEqual(): boolean {
    return false;
  }

  /**
   * Mock method
   */
  public format(): [] {
    return [];
  }

  /**
   * Mock method
   */
  public unformat(): [] {
    return [];
  }
}
