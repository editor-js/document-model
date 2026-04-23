import type { EditorDocumentSerialized } from '@editorjs/model';

/**
 * Document API interface
 * Provides methods to work with Editor's document object
 */
export interface DocumentAPI {
  /**
   * Returns serialized document object
   */
  get data(): EditorDocumentSerialized;
}
