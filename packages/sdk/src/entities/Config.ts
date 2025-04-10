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

  /**
   * Current user's identifier
   *
   * If not passed, a random one will be generated
   */
  userId?: string | number;

  /**
   * Document identifier
   *
   * If not passed, a random one will be generated
   */
  documentId?: string;

  /**
   * Collaboration server address
   */
  collaborationServer?: string;
}

/**
 * After validation we can be sure that all required fields are set
 */
export type CoreConfigValidated = Required<CoreConfig>;

