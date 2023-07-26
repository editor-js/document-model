import { InlineToolName } from './InlineToolName';
import { InlineToolData } from './InlineToolData';
import type { ChildNodeConstructorOptions, ParentNodeConstructorOptions } from '../../interfaces';

export interface FormattingNodeConstructorParameters extends ChildNodeConstructorOptions, ParentNodeConstructorOptions {
  /**
   * The name of the formatting tool applied to the content
   */
  tool: InlineToolName;

  /**
   * Any additional data associated with the formatting
   */
  data?: InlineToolData;
}
