import type { ChildNodeConstructorOptions } from '../../mixins/ChildNode/index.js';

export interface TextInlineNodeConstructorParameters extends ChildNodeConstructorOptions {
  /**
   * Text content of the node
   */
  value?: string;
}
