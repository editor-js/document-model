import type { EditorConfig } from 'editorjs-v2';

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
   * @todo remove or replace with some stable API
   * @param model - EditorJSModel instance
   */
  onModelUpdate?(model: unknown): void;

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
