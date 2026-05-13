import type { Caret, CaretManagerEvents, InlineToolName } from '@editorjs/model';

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

  /**
   * Registers a callback for CaretManager updates. Returns a cleanup function
   * @param callback - callback for CaretManager updates
   */
  onCaretUpdate(callback: (event: CaretManagerEvents) => void): () => void;

  /**
   * Creates a new caret for a user
   * @param userId - user id. If not provided, creates for current user
   */
  createCaret(userId?: string | number): Caret;

  /**
   * Returns user caret
   * @param userId - user id. If not provided, returns for current user
   */
  getCaret(userId?: string | number): Caret | undefined;
}
