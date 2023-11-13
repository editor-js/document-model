import type { InlineNode } from '../../../InlineNode';
import type { ParentNode } from '../../ParentNode';

/**
 * Mock for ChildNode decorator
 */
export function ChildNode(constructor: { new(): InlineNode }): { new(): InlineNode }  {
  return class extends constructor {
    /**
     * Parent mock
     */
    public parent: ParentNode | null = null;
    /**
     * Mock property
     */
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    public length = 5;

    /**
     * Mock method
     *
     * @param parent - parent to append the node to
     */
    public appendTo(parent: ParentNode): void {
      if (this.parent === parent) {
        return;
      }

      this.parent = parent;

      parent.append(this);
    }

    /**
     * Mock method
     */
    public remove(): void {
      return;
    }

    /**
     * Mock method
     */
    public normalize(): void {
      return;
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
    public mergeWith(): void {
      return;
    }
  };
}
