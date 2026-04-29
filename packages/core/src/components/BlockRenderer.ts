import {
  BlockAddedEvent,
  BlockRemovedEvent,
  EditorJSModel,
  EventType,
  ModelEvents
} from '@editorjs/model';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockAPI } from '@editorjs/editorjs';
import {
  EventBus,
  BlockAddedCoreEvent,
  BlockRemovedCoreEvent,
  EditorJSAdapterPlugin
} from '@editorjs/sdk';

/**
 * BlockRenderer subscribes to model block events and is responsible for:
 *  - creating a BlockToolAdapter for each added block
 *  - instantiating and rendering the BlockTool
 *  - dispatching BlockAddedCoreEvent / BlockRemovedCoreEvent to the UI layer
 *
 * It is intentionally separate from BlocksManager so that BlocksManager
 * has no dependency on the Adapter, breaking the circular dependency:
 *   BlocksManager → Adapter → EditorAPI → BlocksAPI → BlocksManager
 *
 * BlockRenderer is resolved in Core.initialize() *after* #initializeAdapter()
 * has registered the Adapter, so the @Inject('Adapter') here is always safe.
 */
@injectable()
export class BlockRenderer {
  /**
   * Editor's Document Model instance to listen for block events
   */
  #model: EditorJSModel;

  /**
   * Editor's EventBus instance to dispatch core events
   */
  #eventBus: EventBus;

  /**
   * Tools manager instance to look up block tools by name
   */
  #toolsManager: ToolsManager;

  /**
   * Adapter plugin instance used to create per-block BlockToolAdapters
   */
  #adapter: EditorJSAdapterPlugin;

  /**
   * BlockRenderer constructor.
   * All parameters are injected through the IoC container.
   * @param model - Editor's Document Model instance
   * @param eventBus - Editor's EventBus instance
   * @param toolsManager - Tools manager instance
   * @param adapter - Adapter plugin instance
   */
  constructor(
    model: EditorJSModel,
    eventBus: EventBus,
    toolsManager: ToolsManager,
    @inject(TOKENS.Adapter) adapter: EditorJSAdapterPlugin
  ) {
    this.#model = model;
    this.#eventBus = eventBus;
    this.#toolsManager = toolsManager;
    this.#adapter = adapter;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Need to bubble the promise up in case of errors
    this.#model.addEventListener(EventType.Changed, event => this.#handleModelUpdate(event));
  }

  /**
   * Handles model update events.
   * Filters only BlockAddedEvent and BlockRemovedEvent.
   * @param event - Model update event
   */
  #handleModelUpdate(event: ModelEvents): Promise<void> | void {
    switch (true) {
      case event instanceof BlockAddedEvent:
        return this.#handleBlockAddedEvent(event);
      case event instanceof BlockRemovedEvent:
        return this.#handleBlockRemovedEvent(event);
      default:
    }
  }

  /**
   * Handles BlockAddedEvent:
   *  - creates a BlockToolAdapter for the block
   *  - instantiates and renders the BlockTool
   *  - dispatches BlockAddedCoreEvent with the rendered UI element
   * @param event - BlockAddedEvent
   */
  async #handleBlockAddedEvent(event: BlockAddedEvent): Promise<void> {
    const { index, data } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('[BlockRenderer] Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const tool = this.#toolsManager.blockTools.get(data.name);

    if (tool === undefined) {
      throw new Error(`[BlockRenderer] Block Tool ${data.name} not found`);
    }

    const blockToolAdapter = this.#adapter.createBlockToolAdapter(index.blockIndex, tool.name);

    const block = tool.create({
      adapter: blockToolAdapter,
      data: data.data,
      block: {} as BlockAPI,
      readOnly: false,
    });

    try {
      const blockElement = await block.render();

      this.#eventBus.dispatchEvent(new BlockAddedCoreEvent({
        tool: tool.name,
        data: data.data,
        ui: blockElement,
        index: index.blockIndex,
      }));
    } catch (error) {
      console.error(`[BlockRenderer] Block Tool ${data.name} failed to render`, error);
    }
  }

  /**
   * Handles BlockRemovedEvent:
   *  - dispatches BlockRemovedCoreEvent so the UI layer removes the block
   * @param event - BlockRemovedEvent
   */
  #handleBlockRemovedEvent(event: BlockRemovedEvent): void {
    const { data, index } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('[BlockRenderer] Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    this.#eventBus.dispatchEvent(new BlockRemovedCoreEvent({
      tool: data.name,
      index: index.blockIndex,
    }));

    /**
     * @todo clear block tool adapter memory
     */
  }
}
