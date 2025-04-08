import type { EditorConfig } from '@editorjs/editorjs';
import type { EditorJSModel } from '@editorjs/model';

/**
 * Editor.js configuration
 */
export interface CoreConfig extends EditorConfig {
  /**
   * Element to insert the editor into. By default #editorjs
   */
  holder?: HTMLElement;

  /**
   * DEV MODE ONLY
   * 
   * Allows to subscribe to model updates. Used in playground for visualizing model changes
   * @param model - EditorJSModel instance
   */
  onModelUpdate?: (model: EditorJSModel) => void;

  userId?: string | number;
}
