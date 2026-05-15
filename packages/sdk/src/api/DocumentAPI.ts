import type { EditorDocumentSerialized, ModelEvents } from '@editorjs/model';

/**
 * Document API interface
 * Provides methods to work with Editor's document object
 */
export interface DocumentAPI {
  /**
   * Returns serialized document object
   */
  get data(): EditorDocumentSerialized;

  /**
   * Registers model's update callback. Returns a cleanup function
   * @param callback - callback called on model update
   */
  onUpdate(callback: (event: ModelEvents) => void): () => void;
}
