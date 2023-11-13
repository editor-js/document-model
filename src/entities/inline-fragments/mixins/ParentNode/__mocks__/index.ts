import type { InlineNode } from '../../../InlineNode';

/**
 * Mock for ParentNode decorator
 */
export  function ParentNode(constructor: { new(): InlineNode }): { new(): InlineNode } {
  return class extends constructor {
    /**
     * Mock method
     */
    public append(): void {
      return;
    }

    /**
     * Mock method
     */
    public removeChild(): void {
      return;
    }
  };
}
