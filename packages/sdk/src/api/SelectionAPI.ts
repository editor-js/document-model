import type { InlineToolName } from '@editorjs/model';

/**
 * Selection API interface
 * Provides methods to work with text selection and inline tools
 */
export interface SelectionAPI {
  /**
   * Applies inline tool for the current selection
   * @param tool - name of the inline tool to apply
   * @param data - optional data for the inline tool
   */
  applyInlineToolForCurrentSelection(tool: InlineToolName, data?: Record<string, unknown>): void;
}
