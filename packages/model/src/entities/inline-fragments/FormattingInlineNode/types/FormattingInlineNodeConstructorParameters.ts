import type { InlineToolName } from '@editorjs/model-types';
import type { InlineToolData } from '@editorjs/model-types';
import type { ChildNodeConstructorOptions } from '../../mixins/ChildNode/index.js';
import type { ParentNodeConstructorOptions } from '../../mixins/ParentNode/index.js';

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
