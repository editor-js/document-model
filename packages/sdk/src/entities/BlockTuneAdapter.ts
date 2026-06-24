import type { BlockId, ModelEvents } from '@editorjs/model';
import { TuneModifiedEvent } from '@editorjs/model';
import type { EditorAPI } from '../api/index.js';
import { TuneDataChangedEvent } from './EventBus/events/adapter/index.js';

/**
 * Abstract BlockTuneAdapter class — provides data persistence and model-update
 * subscription for a single block tune instance.
 *
 * Concrete subclasses (e.g. DOMBlockTuneAdapter in dom-adapters) extend this
 * class and inject the required EditorAPI via the IoC container.
 */
export abstract class BlockTuneAdapter extends EventTarget {
  /**
   * Editor's API
   */
  #api: EditorAPI;

  /**
   * Unique identifier of the block this adapter is bound to
   */
  protected blockId!: BlockId;

  /**
   * Name of the tune this adapter is bound to
   */
  protected tuneName!: string;

  /**
   * Cleanup function returned by api.document.onUpdate()
   */
  #modelChangeListenerCleanup: () => void;

  /**
   * @param api - Editor's API
   */
  constructor(api: EditorAPI) {
    super();

    this.#api = api;

    this.#modelChangeListenerCleanup = this.#api.document.onUpdate(
      ((event: ModelEvents) => this.#handleModelUpdate(event)) as EventListener
    );
  }

  /**
   * Sets the block id this adapter is bound to
   * @param id - unique identifier of the block to bind to
   */
  public setBlockId(id: BlockId): void {
    this.blockId = id;
  }

  /**
   * Sets the tune name this adapter is bound to
   * @param name - tune to bind to
   */
  public setTuneName(name: string): void {
    this.tuneName = name;
  }

  /**
   * Returns the serialized tune data for the current block and tune
   */
  public getData(): Record<string, unknown> {
    return this.#api.blocks.getTuneData({
      block: this.blockId,
      tuneName: this.tuneName,
    });
  }

  /**
   * Updates tune data for the current block and tune
   * @param data - new data (merged into existing data)
   */
  public setData(data: Record<string, unknown>): void {
    this.#api.blocks.updateTuneData({
      block: this.blockId,
      tuneName: this.tuneName,
      data,
    });
  }

  /**
   * Releases resources held by this adapter.
   * Removes the model change listener registered in the constructor.
   */
  public destroy(): void {
    this.#modelChangeListenerCleanup();
  }

  /**
   * Handles model update events.
   * When a TuneModifiedEvent arrives for this adapter's block and tune,
   * dispatches a TuneDataChangedEvent and delegates to the subclass hook.
   * @param event - model event
   */
  #handleModelUpdate(event: ModelEvents): void {
    if (!(event instanceof TuneModifiedEvent)) {
      return;
    }

    const { blockIndex, tuneName } = event.detail.index;

    if (blockIndex === undefined || tuneName === undefined) {
      return;
    }

    const eventBlockId = this.#api.blocks.getIdByIndex(blockIndex);

    if (eventBlockId !== this.blockId || tuneName !== this.tuneName) {
      return;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    const { value, previous } = event.detail.data as { value: unknown; previous: unknown };
    const tuneKey = event.detail.index.tuneKey ?? '';

    this.dispatchEvent(new TuneDataChangedEvent(tuneKey, value, previous));

    this.handleModelUpdate(event);
  }

  /**
   * Hook for subclasses to react to model updates for their block/tune
   * @param event - the model update event to handle
   */
  protected abstract handleModelUpdate(event: ModelEvents): void;
}
