/**
 * Type of the constructor parameters for a ValueNode.
 */
export interface ValueNodeConstructorParameters<ValueType = unknown> {
  /**
   * The value of this value node.
   */
  value: ValueType;
}
