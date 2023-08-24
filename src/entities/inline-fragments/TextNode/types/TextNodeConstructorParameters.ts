import type { ChildNodeConstructorOptions } from '../../mixins/ChildNode';

export interface TextNodeConstructorParameters extends ChildNodeConstructorOptions {
  /**
   * Text content of the node
   */
  value?: string;
}
