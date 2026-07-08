import type { BlockNodeSerialized, Caret, CaretManagerEvents, FormattingAction, Index } from '@editorjs/model-types';

/**
 * Selection API interface
 * Provides methods to work with text selection and inline tools
 */
export interface SelectionAPI {
  /**
   * Applies inline tool for the current selection
   * @param params - method parameters
   */
  applyInlineTool({ tool, data, caretIndex }: {
    /**
     * name of the inline tool to apply
     */
    tool: string;
    /**
     * optional data for the inline tool
     */
    data?: Record<string, unknown>;
    /**
     * caret index where to apply the tool. By default — current caret index
     */
    caretIndex?: Index;
    /**
     * ID of a user who made the change
     */
    userId?: string | number;

    /**
     * By default, method changes the tool state,
     * with this option you can choose a specific action
     */
    action?: FormattingAction;

    /**
     * If true, selection will be restored after the tool is applied.
     * If false, selection will be collapsed to the end
     * By default equals true
     */
    keepSelection?: boolean;
  }): void;

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

  /**
   * Current caret index
   */
  caretIndex: Index | null;

  /**
   * Returns array of selected blocks
   */
  get selectedBlocks(): BlockNodeSerialized[];
}
