// Stryker disable all -- we don't count mutation test coverage fot this file as it just proxy calls to EditorDocument
/* istanbul ignore file -- we don't count test coverage fot this file as it just proxy calls to EditorDocument */
import { type EditorDocumentSerialized, type Index, IndexBuilder } from './entities/index.js';
import { type BlockNodeSerialized, EditorDocument } from './entities/index.js';
import {
  BlockAddedEvent,
  BlockRemovedEvent, EventAction,
  EventBus,
  EventType,
  TextAddedEvent,
  TextRemovedEvent
} from './EventBus/index.js';
import type { ModelEvents, CaretManagerCaretUpdatedEvent, CaretManagerEvents } from './EventBus/index.js';
import { BaseDocumentEvent, type ModifiedEventData } from './EventBus/events/BaseEvent.js';
import { getContext, WithContext } from './utils/Context.js';
import type { Constructor } from './utils/types.js';
import { CaretManager } from './CaretManagement/index.js';

/**
 * Extends EditorJSModel with addEventListener overloads
 */
export interface EditorJSModel {
  /**
   * Overload for EditorDocument events
   */
  addEventListener<K extends ModelEvents>(type: EventType.Changed, listener: (event: K) => void): void;

  /**
   * Overload for CaretManager events
   */
  addEventListener<K extends CaretManagerEvents>(type: EventType.CaretManagerUpdated, listener: (event: K) => void): void;
}

/**
 * EditorJSModel is a wrapper around EditorDocument that prevent access to  internal structures
 */
export class EditorJSModel extends EventBus {
  /**
   * EditorDocument instance
   */
  #document: EditorDocument;

  /**
   * CaretManager instance
   */
  #caretManager: CaretManager;

  /**
   * Current user identifier
   */
  #currentUserId: string | number;

  /**
   * Returns serialized data associated with the document
   *
   * Data contains:
   * - blocks - array of serialized blocks
   * - properties - JSON object with document properties (eg read-only)
   */
  public get serialized(): EditorDocument['serialized'] {
    return this.#document.serialized;
  }

  /**
   * Returns count of child BlockNodes of the EditorDocument.
   */
  public get length(): EditorDocument['length'] {
    return this.#document.length;
  }

  /**
   * Returns the serialised properties of the EditorDocument.
   */
  public get properties(): EditorDocument['properties'] {
    return this.#document.properties;
  }

  /**
   * Constructor for EditorJSModel class.
   *
   * @param currentUserId - current user identifier
   * @param [parameters] - EditorDocument constructor arguments.
   * @param [parameters.children] - The child BlockNodes of the EditorDocument.
   * @param [parameters.properties] - The properties of the document.
   * @param [parameters.toolsRegistry] - ToolsRegistry instance for the current document. Defaults to a new ToolsRegistry instance.
   */
  constructor(currentUserId: string | number, ...parameters: ConstructorParameters<typeof EditorDocument>) {
    super();

    this.#currentUserId = currentUserId;
    this.#document = new EditorDocument(...parameters);
    this.#caretManager = new CaretManager();

    this.#caretManager.addEventListener(
      EventType.CaretManagerUpdated,
      (event: CustomEvent) => {
        const userId = getContext<string | number>();

        this.dispatchEvent(
          new (event.constructor as Constructor<CaretManagerCaretUpdatedEvent>)(event.detail, userId)
        );
      }
    );

    this.#listenAndBubbleDocumentEvents(this.#document);
  }

  /**
   * Fills the EditorDocument with the provided blocks.
   *
   * @param document - document data to initialize
   */
  public initializeDocument(document: Partial<EditorDocumentSerialized> & Pick<EditorDocumentSerialized, 'blocks'>): void {
    this.#document.initialize(document);
  }

  /**
   * Clear all blocks
   */
  public clearBlocks(): void {
    this.#document.clear();
  }

  /**
   *  Creates a new Caret instance in the model
   *
   *  @param parameters - createCaret method parameters
   *  @param [parameters.index] - initial caret index
   */
  @WithContext
  public createCaret(...parameters: Parameters<CaretManager['createCaret']>): ReturnType<CaretManager['createCaret']> {
    return this.#caretManager.createCaret(...parameters);
  }

  /**
   * Updates caret instance in the model
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - updateCaret method parameters
   * @param parameters.caret - Caret instance to update
   */
  @WithContext
  public updateCaret(_userId: string | number, ...parameters: Parameters<CaretManager['updateCaret']>): ReturnType<CaretManager['updateCaret']> {
    console.trace();

    return this.#caretManager.updateCaret(...parameters);
  }


  /**
   * Removes caret instance from the model
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - removeCaret method parameters
   * @param parameters.caret - Caret instance to remove
   */
  @WithContext
  public removeCaret(_userId: string | number, ...parameters: Parameters<CaretManager['removeCaret']>): ReturnType<CaretManager['removeCaret']> {
    return this.#caretManager.removeCaret(...parameters);
  }

  /**
   * Returns property by name.
   * Returns undefined if property does not exist.
   *
   * @param parameters - getProperty method parameters
   * @param parameters.name - The name of the property to return
   */
  public getProperty(...parameters: Parameters<EditorDocument['getProperty']>): ReturnType<EditorDocument['getProperty']> {
    return this.#document.getProperty(...parameters);
  }

  /**
   * Updates a property of the EditorDocument.
   * Adds the property if it does not exist.
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - setProperty method parameters
   * @param parameters.name - The name of the property to update
   * @param parameters.value - The value to update the property with
   */
  @WithContext
  public setProperty(_userId: string | number, ...parameters: Parameters<EditorDocument['setProperty']>): ReturnType<EditorDocument['setProperty']> {
    return this.#document.setProperty(...parameters);
  }

  /**
   * Adds a BlockNode to the EditorDocument at the specified index.
   * If no index is provided, the BlockNode will be added to the end of the array.
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - addBlock method parameters
   * @param parameters.blockNodeData - The data to create the BlockNode with
   * @param parameters.index - The index at which to add the BlockNode
   * @throws Error if the index is out of bounds
   */
  @WithContext
  public addBlock(_userId: string | number, ...parameters: Parameters<EditorDocument['addBlock']>): ReturnType<EditorDocument['addBlock']> {
    return this.#document.addBlock(...parameters);
  }

  /**
   * Removes a BlockNode from the EditorDocument at the specified index.
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - removeBlock method parameters
   * @param parameters.index - The index of the BlockNode to remove
   * @throws Error if the index is out of bounds
   */
  @WithContext
  public removeBlock(_userId: string | number, ...parameters: Parameters<EditorDocument['removeBlock']>): ReturnType<EditorDocument['removeBlock']> {
    return this.#document.removeBlock(...parameters);
  }

  /**
   * Inserts data to the specified index
   *
   * @param _userId - user identifier which is being set to the context
   * @param index - index to insert data
   * @param data - data to insert (text or blocks)
   */
  @WithContext
  public insertData(_userId: string | number | undefined, index: Index, data: string | BlockNodeSerialized[]): void {
    this.#document.insertData(index, data);
  }

  /**
   * Removes data from the specified index
   *
   * @param _userId - user identifier which is being set to the context
   * @param index - index to remove data from
   * @param data - text or blocks to remove
   */
  @WithContext
  public removeData(_userId: string | number | undefined, index: Index, data: string | BlockNodeSerialized[]): void {
    this.#document.removeData(index, data);
  }

  /**
   * Modifies data for the specific index
   *
   * @param _userId - user identifier which is being set to the context
   * @param index - index of data to modify
   * @param data - data to modify (includes current and previous values)
   */
  @WithContext
  public modifyData(_userId: string | number | undefined, index: Index, data: ModifiedEventData): void {
    this.#document.modifyData(index, data);
  }

  /**
   * Updates the ValueNode data associated with the BlockNode at the specified index.
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - updateValue method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.dataKey - The key of the ValueNode to update
   * @param parameters.value - The new value of the ValueNode
   * @throws Error if the index is out of bounds
   */
  @WithContext
  public updateValue(_userId: string | number, ...parameters: Parameters<EditorDocument['updateValue']>): ReturnType<EditorDocument['updateValue']> {
    return this.#document.updateValue(...parameters);
  }

  /**
   * Updates BlockTune data associated with the BlockNode at the specified index.
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - updateTuneData method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.tuneName - The name of the BlockTune to update
   * @param parameters.data - The data to update the BlockTune with
   * @throws Error if the index is out of bounds
   */
  @WithContext
  public updateTuneData(_userId: string | number, ...parameters: Parameters<EditorDocument['updateTuneData']>): ReturnType<EditorDocument['updateTuneData']> {
    return this.#document.updateTuneData(...parameters);
  }

  /**
   * Returns a text from the specified block and data key
   *
   * @param parameters - getText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   */
  public getText(...parameters: Parameters<EditorDocument['getText']>): ReturnType<EditorDocument['getText']> {
    return this.#document.getText(...parameters);
  }

  /**
   * Inserts text to the specified block
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - insertText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.text - text to insert
   * @param [parameters.start] - char index where to insert text
   */
  @WithContext
  public insertText(_userId: string | number, ...parameters: Parameters<EditorDocument['insertText']>): ReturnType<EditorDocument['insertText']> {
    return this.#document.insertText(...parameters);
  }

  /**
   * Removes text from specified block
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - removeText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param [parameters.start] - start char index of the range
   * @param [parameters.end] - end char index of the range
   */
  @WithContext
  public removeText(_userId: string | number, ...parameters: Parameters<EditorDocument['removeText']>): ReturnType<EditorDocument['removeText']> {
    return this.#document.removeText(...parameters);
  }

  /**
   * Formats text in the specified block
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - format method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.tool - name of the Inline Tool to apply
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   * @param [parameters.data] - Inline Tool data if applicable
   */
  @WithContext
  public format(_userId: string | number, ...parameters: Parameters<EditorDocument['format']>): ReturnType<EditorDocument['format']> {
    return this.#document.format(...parameters);
  }

  /**
   * Removes formatting from the specified block
   *
   * @param _userId - user identifier which is being set to the context
   * @param parameters - unformat method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.key - key of the data
   * @param parameters.tool - name of the Inline Tool to remove
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   */
  @WithContext
  public unformat(_userId: string | number, ...parameters: Parameters<EditorDocument['unformat']>): ReturnType<EditorDocument['unformat']> {
    return this.#document.unformat(...parameters);
  }

  /**
   * Returns fragments for the specified block, range, and inline tool
   *
   * @param parameters - getFragments method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param [parameters.tool] - name of the Inline Tool to remove
   * @param [parameters.start] - start char index of the range
   * @param [parameters.end] - end char index of the range
   */
  public getFragments(...parameters: Parameters<EditorDocument['getFragments']>): ReturnType<EditorDocument['getFragments']> {
    return this.#document.getFragments(...parameters);
  }

  /**
   * Exposing document for dev-tools
   *
   * USE ONLY FOR DEV PURPOSES
   */
  public devModeGetDocument(): EditorDocument {
    return this.#document;
  }

  /**
   * Listens to BlockNode events and bubbles re-emits them from the EditorJSModel instance
   *
   * @param document - EditorDocument instance to listen to
   */
  #listenAndBubbleDocumentEvents(document: EditorDocument): void {
    document.addEventListener(
      EventType.Changed,
      (event: Event) => {
        if (!(event instanceof BaseDocumentEvent)) {
          console.error('EditorJSModel: EditorDocument should only emit BaseDocumentEvent objects');

          return;
        }

        const userId = getContext<string | number>();

        if (userId !== this.#currentUserId) {
          /**
           * If update is made by a remote user, we might need to update current user's caret
           */
          this.#updateUserCaretByRemoteChange(event);
        }

        const index = new IndexBuilder()
          .from(event.detail.index)
          .addDocumentId(this.#document.identifier)
          .build();

        /**
         * Here could be any logic to filter EditorDocument events;
         */

        this.dispatchEvent(
          new (event.constructor as Constructor<ModelEvents>)(
            index,
            event.detail.data,
            userId
          )
        );
      }
    );
  }

  /**
   * Update current user's caret by the model event not from the current user
   * E.g. if another user inserts a character before the current user's caret, we need to update the caret
   *
   * @param event - model event to update caret by
   */
  #updateUserCaretByRemoteChange(event: ModelEvents): void {
    const userCaret = this.#caretManager.getCaret(this.#currentUserId);

    if (userCaret === undefined || userCaret.index === null) {
      return;
    }

    const caretIndex = userCaret.index;

    const newIndex = new IndexBuilder().from(caretIndex);
    const index = event.detail.index;

    switch (true) {
      case (event instanceof TextAddedEvent):
      case (event instanceof TextRemovedEvent): {
        if (index.blockIndex !== caretIndex.blockIndex || index.dataKey !== caretIndex.dataKey) {
          return;
        }

        if (index.textRange![0] > caretIndex.textRange![0]) {
          return;
        }

        const delta = event.detail.data.length * (event.detail.action === EventAction.Added ? 1 : -1);

        newIndex.addTextRange([caretIndex.textRange![0] + delta, caretIndex.textRange![1] + delta]);

        break;
      }

      case (event instanceof BlockRemovedEvent):
      case (event instanceof BlockAddedEvent): {
        if (index.blockIndex! >= caretIndex.blockIndex!) {
          return;
        }

        /**
         * @todo if removed block is the one the caret currently in — move caret to the previous block
         */
        newIndex.addBlockIndex(caretIndex.blockIndex! + (event.detail.action === EventAction.Added ? 1 : -1));

        break;
      }

      default:
        return;
    }

    userCaret.update(newIndex.build());
  }
}
