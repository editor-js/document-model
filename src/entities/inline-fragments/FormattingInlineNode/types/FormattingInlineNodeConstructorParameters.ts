import { InlineToolName } from './InlineToolName';
import { InlineToolData } from './InlineToolData';
import type { ChildNodeConstructorOptions } from '../../mixins/ChildNode';
import type { ParentNodeConstructorOptions } from '../../mixins/ParentNode';

export interface FormattingInlineNodeConstructorParameters extends ChildNodeConstructorOptions, ParentNodeConstructorOptions {
  /**
   * The name of the formatting tool applied to the content
   */
  tool: InlineToolName;

  /**
   * Any additional data associated with the formatting
   */
  data?: InlineToolData;
}
