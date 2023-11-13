import type { ChildNodeConstructorOptions } from '../../mixins/ChildNode';

export interface TextInlineNodeConstructorParameters extends ChildNodeConstructorOptions {
  /**
   * Text content of the node
   */
  value?: string;
}
