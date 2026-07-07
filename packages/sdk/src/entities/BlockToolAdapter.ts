import type { BlockId, TextNodeSerialized, ValueSerialized, EventBus, ModelEvents } from '@editorjs/model-types';
import {
  DataNodeAddedEvent,
  DataNodeRemovedEvent,
  ValueModifiedEvent,
  NODE_TYPE_HIDDEN_PROP,
  BlockChildType
} from '@editorjs/model-types';
import type { CoreConfig } from '@/entities/Config';
import { KeyAddedEvent, KeyRemovedEvent, ValueNodeChangedEvent } from './EventBus/events/adapter/index.js';
import type { EditorAPI } from '../api/index.js';

/**
 * Abstract BlockToolAdapter class implementing core functionality of the block adapter
 */
export abstract class BlockToolAdapter extends EventTarget {
  /**
   * Editor's API
   */
  #api: EditorAPI;

  /**
   * Unique identifier of the block that this adapter is connected to
   */
  protected blockId!: BlockId;

  /**
   * Editor's config
   */
  protected config: Required<CoreConfig>;

  /**
   * Editor's global EventBus
   */
  protected eventBus: EventBus;

  /**
   * Stored reference to the model change listener so it can be removed on destroy.
   */
  #modelChangeListenerCleanup: () => void;

  /**
   * @param config - editor's configuration
   * @param api - Editor's API
   * @param eventBus - global event bus instance
   */
  constructor(config: Required<CoreConfig>, api: EditorAPI, eventBus: EventBus) {
    super();

    this.#api = api;
    this.config = config;
    this.eventBus = eventBus;

    this.#modelChangeListenerCleanup = this.#api.document.onUpdate(
      ((event: ModelEvents) => this.#handleModelUpdate(event)) as EventListener
    );
  }

  /**
   * Releases all resources held by this adapter.
   * Removes the model change listener registered in the constructor.
   * Subclasses that register additional listeners should override this method,
   * call `super.destroy()`, and then remove their own listeners.
   */
  public destroy(): void {
    this.#modelChangeListenerCleanup();
  }

  /**
   * Updates the block id the adapter is connected to.
   * @param id - new block id
   */
  public setBlockId(id: BlockId): void {
    this.blockId = id;
  }

  /**
   * Returns the block id of the adapter
   */
  public getBlockId(): BlockId {
    return this.blockId;
  }

  /**
   * @deprecated Use {@link getBlockId} instead.
   * Returns the current block index by asking the model.
   */
  public getBlockIndex(): number {
    return this.#api.blocks.getIndexById(this.blockId);
  }

  /**
   * Creates data node for the text input key
   * @param key - input key within the block
   * @param initialData - optional initial data for the block
   */
  public registerTextInputKey<Data extends TextNodeSerialized = TextNodeSerialized>(key: string, initialData?: Pick<Data, 'value'> & Partial<Data>): void {
    const data: TextNodeSerialized = {
      value: initialData?.value ?? '',
      fragments: initialData?.fragments ?? [],
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
    };

    this.#createDataNode(key, data);
  }

  /**
   * Creates data node for the value key. Returns an update function which could be called to update value in the model
   * @param key - value key within the block
   * @param initialData - optional initial data for the value
   */
  public registerValueKey<V = unknown>(key: string, initialData?: ValueSerialized<V>): (newValue: V) => void {
    this.#createDataNode(key, initialData);

    return (newValue: V) => {
      this.#api.blocks.updateValue({
        block: this.blockId,
        key,
        value: newValue,
      });
    };
  }

  /**
   * Remove data node by the key
   * @param key - key of the node to remove
   */
  public removeKey(key: string): void {
    if (this.#api.blocks.getData({
      block: this.blockId,
      key,
    }) === undefined) {
      return;
    }

    this.#api.blocks.removeData({
      block: this.blockId,
      key,
    });
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
  #createDataNode<V = unknown>(key: string, initialData?: TextNodeSerialized | ValueSerialized<V>): void {
    if (this.#api.blocks.getData({
      block: this.blockId,
      key,
    }) !== undefined) {
      return;
    }

    this.#api.blocks.createData({
      block: this.blockId,
      key,
      initialData,
    });
  }

  /**
   * Handles model updates. Dispatches adapter events and calls the abstract method for the child classes
   * @param event - Model event
   */
  #handleModelUpdate(event: ModelEvents): void {
    const { blockIndex } = event.detail.index;

    if (blockIndex === undefined) {
      return;
    }

    const eventBlockId = this.#api.blocks.getIdByIndex(blockIndex);

    if (eventBlockId !== this.blockId) {
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
