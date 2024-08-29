import type { ToolSettings, ToolConstructable } from '@editorjs/editorjs';
import type { BlockToolConstructor, InlineToolConstructor } from '@editorjs/sdk';

export type UnifiedToolConfig = Record<string, Omit<ToolSettings, 'class'> & {
  /**
   * Tool constructor
   */
  class: ToolConstructable | BlockToolConstructor | InlineToolConstructor;

  /**
   * Specifies if tool is internal
   */
  isInternal?: boolean;
}>;
