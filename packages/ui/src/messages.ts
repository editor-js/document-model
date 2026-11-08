/**
 * Every user-facing string `@editorjs/ui` writes into the DOM, in one place.
 *
 * None of these is rendered visually — they exist to be read out by assistive technology — but
 * they are user-facing text all the same, and localising them will mean sourcing them from the
 * editor config instead of from here. Collecting them in one module is what makes that a change
 * to a single file rather than to every call site that sets an attribute. i18n itself stays out
 * of scope (see the Non-Goals in `openspec/changes/add-editor-aria-semantics/design.md`); this
 * is only the seam it would attach to.
 */
export const messages = {
  /** Accessible name of the container holding the block-level controls */
  blockActionsToolbar: 'Block actions',

  /** Accessible name of the icon-only button that opens the toolbox */
  addBlockButton: 'Add block',

  /** Accessible name of the toolbox menu. Deliberately matches the button that opens it */
  addBlockMenu: 'Add block',

  /** Accessible name of the inline formatting toolbar, distinguishing it from the block one */
  inlineToolbar: 'Text formatting',

  /**
   * Announced when the inline toolbar appears. It takes no DOM focus and moves no virtual
   * cursor, so without this nothing tells a screen reader user that it is there at all
   */
  inlineToolbarAvailable: 'Text formatting toolbar available. Press Tab to enter.',
} as const;
