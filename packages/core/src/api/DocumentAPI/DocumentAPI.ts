import 'reflect-metadata';
import { Service } from 'typedi';

import { type EditorDocumentSerialized, EditorJSModel } from '@editorjs/model';
import { DocumentAPI as DocumentApiInterface } from '@editorjs/sdk';

/**
 * Document API
 *  - provides access to document serialized data
 */
@Service()
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
}
