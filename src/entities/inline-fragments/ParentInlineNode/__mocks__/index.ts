import type { InlineFragment, InlineNode } from '../../InlineNode';

/**
 * We still need actual class for private and protected methods we can't mock
 */
// eslint-disable-next-line no-undef
const { ParentInlineNode: ActualClass } = jest.requireActual('../index');

/**
 * Mock for ParentInlineNode class
 */
export class ParentInlineNode extends ActualClass {
  #children: ChildNode[] = [];

  /**
   * Mock method
   */
  public get children(): ChildNode[] {
    return this.#children;
  }

  /**
   * Mock method
   */
  public removeText(): void {
    return;
  }

  /**
   * Mock method
   */
  public getFragments(): Array<InlineFragment> {
    return [];
  }

  /**
   * Mock method
   */
  public format(): Array<InlineNode> {
    return [];
  }

  /**
   * Mock method
   */
  public unformat(): Array<InlineNode> {
    return [];
  }
}
