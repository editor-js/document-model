import type { DataKey, EditorJSModel, EventBus, ModelEvents, TextNodeSerialized, ValueSerialized } from '@editorjs/model';
import {
  createDataKey,
  DataNodeAddedEvent,
  DataNodeRemovedEvent,
  EventType,
  NODE_TYPE_HIDDEN_PROP,
  ValueModifiedEvent,
  BlockChildType
} from '@editorjs/model';
import type { CoreConfig } from '@/entities/Config';
import { KeyAddedEvent, KeyRemovedEvent, ValueNodeChangedEvent } from './EventBus/events/adapter/index.js';

/**
 * Abstract BlockToolAdapter class implementing core functionality of the block adapter
 */
export abstract class BlockToolAdapter extends EventTarget {
  /**
   * Model instance
   */
  protected model: EditorJSModel;

  /**
   * Index of the block that this adapter is connected to
   */
  protected blockIndex: number = 0;

  /**
   * Editor's config
   */
  protected config: Required<CoreConfig>;

  /**
   * Editor's global EventBus
   */
  protected eventBus: EventBus;

  /**
   * @param config - editor's configuration
   * @param model - model instance
   * @param eventBus - global event bus instance
   */
  constructor(config: Required<CoreConfig>, model: EditorJSModel, eventBus: EventBus) {
    super();

    this.model = model;
    this.config = config;
    this.eventBus = eventBus;

    this.model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event));
  }

  /**
   * Updates the internal block index.
   * @param index - new block index value
   */
  public setBlockIndex(index: number): void {
    this.blockIndex = index;
  }

  /**
   * Returns block index of the adapter
   */
  public getBlockIndex(): number {
    return this.blockIndex;
  }

  /**
   * Creates data node for the text input key
   * @param keyRaw - input key within the block
   * @param initialData - optional initial data for the block
   */
  public registerTextInputKey<Data extends TextNodeSerialized = TextNodeSerialized>(keyRaw: string, initialData?: Pick<Data, 'value'> & Partial<Data>): void {
    const data: TextNodeSerialized = {
      value: initialData?.value ?? '',
      fragments: initialData?.fragments ?? [],
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
    };

    this.#createDataNode(createDataKey(keyRaw), data);
  }

  /**
   * Creates data node for the value key
   * @param keyRaw - value key within the block
   * @param initialData - optional initial data for the value
   */
  public registerValueKey<V = unknown>(keyRaw: string, initialData?: ValueSerialized<V>): void {
    this.#createDataNode(createDataKey(keyRaw), initialData);
  }

  /**
   * Remove data node by the key
   * @param keyRaw - key of the node to remove
   */
  public removeKey(keyRaw: string): void {
    if (this.model.getDataNode(this.config.userId, this.blockIndex, keyRaw) === undefined) {
      return;
    }

    this.model.removeDataNode(this.config.userId, this.blockIndex, createDataKey(keyRaw));
  }

  /**
   * Creates data node in the model
   * @param key - key of the node
   * @param initialData - optional initial data for the node
   * @example
   * // Register a text input key with initial content
   * this.#createDataNode(createDataKey('content'), { $t: 't', value: 'Hello', fragments: [] });
   *
   * // Register a value key in an array (e.g. for items[0].content)
   * this.#createDataNode(createDataKey('items[0].content'), { $t: 'v', value: 'Item text' });
   */
  #createDataNode<V = unknown>(key: DataKey, initialData?: TextNodeSerialized | ValueSerialized<V>): void {
    if (this.model.getDataNode(this.config.userId, this.blockIndex, key) !== undefined) {
      return;
    }

    this.model.createDataNode(this.config.userId, this.blockIndex, key, initialData);
  }

  /**
   * Handles model updates. Dispatches adapter events and calls the abstract method for the child classes
   * @param event - Model event
   */
  #handleModelUpdate(event: ModelEvents): void {
    const { blockIndex } = event.detail.index;

    if (blockIndex !== this.blockIndex) {
      return;
    }

    switch (true) {
      case event instanceof DataNodeAddedEvent: {
        const { dataKey } = event.detail.index;

        this.dispatchEvent(new KeyAddedEvent(dataKey as string));

        break;
      }

      case event instanceof DataNodeRemovedEvent: {
        const { dataKey } = event.detail.index;

        this.dispatchEvent(new KeyRemovedEvent(dataKey as string));

        break;
      }

      case event instanceof ValueModifiedEvent: {
        const { dataKey } = event.detail.index;
        const value = event.detail.data;

        this.dispatchEvent(new ValueNodeChangedEvent(dataKey as string, value));

        break;
      }
    }

    this.handleModelUpdate(event);
  }

  /**
   * Abstract method for the child classes to handle model updates
   * @param event - event object
   */
  protected abstract handleModelUpdate(event: ModelEvents): void;
}
