import 'reflect-metadata';

import { type EditorDocumentSerialized, EditorJSModel, EventType, ModelEvents } from '@editorjs/model';
import { DocumentAPI as DocumentApiInterface } from '@editorjs/sdk';
import { injectable } from 'inversify';

/**
 * Document API
 *  - provides access to document serialized data
 */
@injectable()
export class DocumentAPI implements DocumentApiInterface {
  /**
   * Editor document model instance
   */
  #model: EditorJSModel;

  /**
   * DocumentAPI constructor
   * All parameters are injected through the IoC container
   * @param model - Editor's Document Model instance
   */
  constructor(model: EditorJSModel) {
    this.#model = model;
  }

  /**
   * Returns serialized document object
   */
  public get data(): EditorDocumentSerialized {
    return this.#model.serialized;
  }

  /**
   * Registers model's update callback. Returns a cleanup function
   * @param callback - callback called on model update
   */
  public onUpdate(callback: (event: ModelEvents) => void): () => void {
    this.#model.addEventListener(EventType.Changed, callback);

    return () => {
      this.#model.removeEventListener(EventType.Changed, callback);
    };
  }
}
