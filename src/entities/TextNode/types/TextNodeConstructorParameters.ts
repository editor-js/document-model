import type { ChildNodeConstructorOptions } from '../../interfaces';

export interface TextNodeConstructorParameters extends ChildNodeConstructorOptions {
  /**
   * Text content of the node
   */
  value?: string;
}
