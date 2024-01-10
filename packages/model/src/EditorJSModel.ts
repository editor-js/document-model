// Stryker disable all -- we don't count mutation test coverage fot this file as it just proxy calls to EditorDocument
/* istanbul ignore file -- we don't count test coverage fot this file as it just proxy calls to EditorDocument */
import { EditorDocument } from './entities/index.js';
import { EventBus, EventType } from './utils/index.js';
import type { ModelEvents, CaretManagerCaretUpdatedEvent, CaretManagerEvents } from './utils/index.js';
import { BaseDocumentEvent } from './EventBus/events/BaseEvent.js';
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
   * @param [parameters] - EditorDocument constructor arguments.
   * @param [parameters.children] - The child BlockNodes of the EditorDocument.
   * @param [parameters.properties] - The properties of the document.
   * @param [parameters.toolsRegistry] - ToolsRegistry instance for the current document. Defaults to a new ToolsRegistry instance.
   */
  constructor(...parameters: ConstructorParameters<typeof EditorDocument>) {
    super();

    this.#document = new EditorDocument(...parameters);
    this.#caretManager = new CaretManager();

    this.#caretManager.addEventListener(
      EventType.CaretManagerUpdated,
      (event: CustomEvent) => {
        this.dispatchEvent(
          new (event.constructor as Constructor<CaretManagerCaretUpdatedEvent>)(event.detail)
        );
      }
    );

    this.#listenAndBubbleDocumentEvents(this.#document);
  }

  /**
   *  Creates a new Caret instance in the model
   *
   *  @param parameters - createCaret method parameters
   *  @param [parameters.index] - initial caret index
   */
  public createCaret(...parameters: Parameters<CaretManager['createCaret']>): ReturnType<CaretManager['createCaret']> {
    return this.#caretManager.createCaret(...parameters);
  }

  /**
   * Updates caret instance in the model
   *
   * @param parameters - updateCaret method parameters
   * @param parameters.caret - Caret instance to update
   */
  public updateCaret(...parameters: Parameters<CaretManager['updateCaret']>): ReturnType<CaretManager['updateCaret']> {
    return this.#caretManager.updateCaret(...parameters);
  }


  /**
   * Removes caret instance from the model
   *
   * @param parameters - removeCaret method parameters
   * @param parameters.caret - Caret instance to remove
   */
  public removeCaret(...parameters: Parameters<CaretManager['removeCaret']>): ReturnType<CaretManager['removeCaret']> {
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
   * @param parameters - setProperty method parameters
   * @param parameters.name - The name of the property to update
   * @param parameters.value - The value to update the property with
   */
  public setProperty(...parameters: Parameters<EditorDocument['setProperty']>): ReturnType<EditorDocument['setProperty']> {
    return this.#document.setProperty(...parameters);
  }

  /**
   * Adds a BlockNode to the EditorDocument at the specified index.
   * If no index is provided, the BlockNode will be added to the end of the array.
   *
   * @param parameters - addBlock method parameters
   * @param parameters.blockNodeData - The data to create the BlockNode with
   * @param parameters.index - The index at which to add the BlockNode
   * @throws Error if the index is out of bounds
   */
  public addBlock(...parameters: Parameters<EditorDocument['addBlock']>): ReturnType<EditorDocument['addBlock']> {
    return this.#document.addBlock(...parameters);
  }

  /**
   * Moves a BlockNode from one index to another
   *
   * @param parameters = moveBlock method parameters
   * @param parameters.from - The index of the BlockNode to move
   * @param parameters.to - The index to move the BlockNode to
   * @throws Error if the index is out of bounds
   */
  public moveBlock(...parameters: Parameters<EditorDocument['moveBlock']>): ReturnType<EditorDocument['moveBlock']> {
    return this.#document.moveBlock(...parameters);
  }


  /**
   * Removes a BlockNode from the EditorDocument at the specified index.
   *
   * @param parameters - removeBlock method parameters
   * @param parameters.index - The index of the BlockNode to remove
   * @throws Error if the index is out of bounds
   */
  public removeBlock(...parameters: Parameters<EditorDocument['removeBlock']>): ReturnType<EditorDocument['removeBlock']> {
    return this.#document.removeBlock(...parameters);
  }

  /**
   * Updates the ValueNode data associated with the BlockNode at the specified index.
   *
   * @param parameters - updateValue method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.dataKey - The key of the ValueNode to update
   * @param parameters.value - The new value of the ValueNode
   * @throws Error if the index is out of bounds
   */
  public updateValue(...parameters: Parameters<EditorDocument['updateValue']>): ReturnType<EditorDocument['updateValue']> {
    return this.#document.updateValue(...parameters);
  }

  /**
   * Updates BlockTune data associated with the BlockNode at the specified index.
   *
   * @param parameters - updateTuneData method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.tuneName - The name of the BlockTune to update
   * @param parameters.data - The data to update the BlockTune with
   * @throws Error if the index is out of bounds
   */
  public updateTuneData(...parameters: Parameters<EditorDocument['updateTuneData']>): ReturnType<EditorDocument['updateTuneData']> {
    return this.#document.updateTuneData(...parameters);
  }

  /**
   * Inserts text to the specified block
   *
   * @param parameters - insertText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.text - text to insert
   * @param [parameters.start] - char index where to insert text
   */
  public insertText(...parameters: Parameters<EditorDocument['insertText']>): ReturnType<EditorDocument['insertText']> {
    return this.#document.insertText(...parameters);
  }

  /**
   * Removes text from specified block
   *
   * @param parameters - removeText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param [parameters.start] - start char index of the range
   * @param [parameters.end] - end char index of the range
   */
  public removeText(...parameters: Parameters<EditorDocument['removeText']>): ReturnType<EditorDocument['removeText']> {
    return this.#document.removeText(...parameters);
  }

  /**
   * Formats text in the specified block
   *
   * @param parameters - format method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.tool - name of the Inline Tool to apply
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   * @param [parameters.data] - Inline Tool data if applicable
   */
  public format(...parameters: Parameters<EditorDocument['format']>): ReturnType<EditorDocument['format']> {
    return this.#document.format(...parameters);
  }

  /**
   * Removes formatting from the specified block
   *
   * @param parameters - unformat method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.key - key of the data
   * @param parameters.tool - name of the Inline Tool to remove
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   */
  public unformat(...parameters: Parameters<EditorDocument['unformat']>): ReturnType<EditorDocument['unformat']> {
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

        /**
         * Here could be any logic to filter EditorDocument events;
         */

        this.dispatchEvent(
          new (event.constructor as Constructor<ModelEvents>)(event.detail.index, event.detail.data)
        );
      }
    );
  }
}
