/**
 * Every user-facing string this plugin puts in the settings menu, in one place.
 *
 * Collected here for the same reason `@editorjs/ui` collects its own: localising them will mean
 * sourcing them from the editor config instead, and that is a change to this module rather than
 * to every item it builds. i18n itself stays out of scope; this is only the seam it attaches to.
 */
export const messages = {
  /** Item that moves the block one position up */
  moveUp: 'Move up',

  /** Item that moves the block one position down */
  moveDown: 'Move down',

  /** Item that asks before deleting the block */
  delete: 'Delete',

  /** What the delete item becomes once activated, and what actually deletes on activation */
  deleteConfirmation: 'Click to delete',
};
