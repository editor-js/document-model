import 'reflect-metadata';

import { type EditorDocumentSerialized, EditorJSModel, EventType, type ModelEvents } from '@editorjs/model';
import {
  CoreConfigValidated,
  DocumentAPI as DocumentApiInterface, EventBus,
  type InsertRemoveDataParams,
  type ModifyDataParams, RedoCoreEvent, UndoCoreEvent
} from '@editorjs/sdk';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../../tokens.js';

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
   * Editor's config
   */
  #config: CoreConfigValidated;

  /**
   * Editor's event bus instance
   */
  #eventBus: EventBus;

  /**
   * DocumentAPI constructor
   * All parameters are injected through the IoC container
   * @param model - Editor's Document Model instance
   * @param config - Editor's config
   * @param eventBus - Editor's event bus instance
   */
  constructor(
    model: EditorJSModel,
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated,
    eventBus: EventBus
  ) {
    this.#model = model;
    this.#config = config;
    this.#eventBus = eventBus;
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

  /**
   * Inserts data at the specified index
   * @param params - insert data method params
   * @param [params.userId] - user identifier attributed to the change
   * @param params.index - position in the document tree where data should be inserted
   * @param params.data - text or blocks to insert
   */
  public insertData({ userId = this.#config.userId, index, data }: InsertRemoveDataParams): void {
    this.#model.insertData(userId, index, data);
  }

  /**
   * Removes data at the specified index
   * @param params - remove data method params
   * @param [params.userId] - user identifier attributed to the change
   * @param params.index - Index of the document node to remove
   * @param params.data - removed data
   */
  public removeData({ userId = this.#config.userId, index, data }: InsertRemoveDataParams): void {
    this.#model.removeData(userId, index, data);
  }

  /**
   * Modifies data at the specified index
   * @param params - modify data method params
   * @param [params.userId] - user identifier attributed to the change
   * @param params.index - Index of the document node to modify
   * @param params.data - modification data containing current and previous values
   */
  public modifyData({ userId = this.#config.userId, index, data }: ModifyDataParams): void {
    this.#model.modifyData(userId, index, data);
  }

  /**
   * Undoes the last change in the document
   */
  public undo(): void {
    this.#eventBus.dispatchEvent(new UndoCoreEvent());
  }

  /**
   * Redoes the last undone change in the document
   */
  public redo(): void {
    this.#eventBus.dispatchEvent(new RedoCoreEvent());
  }
}
