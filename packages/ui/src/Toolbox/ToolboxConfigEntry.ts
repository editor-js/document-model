import type { BlockToolData } from '@editorjs/sdk';

/**
 * Toolbox configuration entry for the Tool
 */
export interface ToolboxOptionsEntry {
  /**
   * Tool title for Toolbox
   */
  title?: string;

  /**
   * HTML string with an icon for Toolbox
   */
  icon?: string;

  /**
   * May contain overrides for tool default data
   */
  data?: BlockToolData;
}
