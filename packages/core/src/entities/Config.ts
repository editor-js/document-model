import type { EditorConfig } from '@editorjs/editorjs';

/**
 * Editor.js configuration
 */
export interface CoreConfig extends EditorConfig {
  /**
   * Element to insert the editor into. By default #editorjs
   */
  holder?: HTMLElement;
}

/**
 * After validation we can be sure that all required fields are set
 */
export type CoreConfigValidated = Required<CoreConfig>;
