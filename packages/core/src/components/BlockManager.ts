import { BlockAddedEvent, BlockRemovedEvent, EditorJSModel, EventType, ModelEvents } from '@editorjs/model';
import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlockToolAdapter, CaretAdapter, FormattingAdapter } from '@editorjs/dom-adapters';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockAPI, BlockToolData } from '@editorjs/editorjs';
import { CoreConfigValidated } from '../entities/Config.js';
import { BlockAddedCoreEvent, BlockRemovedCoreEvent } from './EventBus/index.js';
import { EventBus } from '@editorjs/sdk';
/**
 * Parameters for the BlocksManager.insert() method
 */
interface InsertBlockParameters {
  // id?: string;
  /**
   * Block tool name to insert
   */
  type?: string;
  /**
   * Block's initial data
   */
  data?: BlockToolData;
  /**
   * Index to insert block at
   */
  index?: number;
  // needToFocus?: boolean;
  /**
   * Flag indicates if block at index should be replaced
   */
  replace?: boolean;
  // tunes?: {[name: string]: BlockTuneData};
}

/**
 * BlocksManager is responsible for
 *  - handling block adding and removing events
 *  - updating the Model blocks data on user actions
 */
@Service()
export class BlocksManager {
  /**
   * Editor's Document Model instance to get and update blocks data
   */
  #model: EditorJSModel;

  /**
   * Editor's EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Caret Adapter instance
   * Required here to create BlockToolAdapter
   */
  #caretAdapter: CaretAdapter;

  /**
   * Tools manager instance to get block tools
   */
  #toolsManager: ToolsManager;

  /**
   * Editor's validated user configuration
   */
  #config: CoreConfigValidated;

  /**
   * Will be passed to BlockToolAdapter for rendering inputs` formatted text
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * BlocksManager constructor
   * All parameters are injected thorugh the IoC container
   * @param model - Editor's Document Model instance
   * @param eventBus - Editor's EventBus instance
   * @param caretAdapter - Caret Adapter instance
   * @param toolsManager - Tools manager instance
   * @param formattingAdapter - will be passed to BlockToolAdapter for rendering inputs` formatted text
   * @param config - Editor validated configuration
   */
  constructor(
    model: EditorJSModel,
    eventBus: EventBus,
    caretAdapter: CaretAdapter,
    toolsManager: ToolsManager,
    formattingAdapter: FormattingAdapter,
    @Inject('EditorConfig') config: CoreConfigValidated
  ) {
    this.#model = model;
    this.#eventBus = eventBus;
    this.#caretAdapter = caretAdapter;
    this.#toolsManager = toolsManager;
    this.#formattingAdapter = formattingAdapter;
    this.#config = config;

    this.#model.addEventListener(EventType.Changed, event => this.#handleModelUpdate(event));
  }

  /**
   * Inserts a new block to the editor at the specified index
   * @param parameters - method paramaters object
   * @param parameters.type - block tool name to insert
   * @param parameters.data - block's initial data
   * @param parameters.index - index to insert block at
   * @param parameters.replace - flag indicates if block at index should be replaced
   */
  public insert({
    // id = undefined,
    type = this.#config.defaultBlock,
    data = {},
    index,
    // needToFocus = true,
    replace = false,
    // tunes = {},
  }: InsertBlockParameters = {}): void {
    let newIndex = index;

    if (newIndex === undefined) {
      newIndex = this.#model.length + (replace ? 0 : 1);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.#model.addBlock(this.#config.userId, {
      ...data,
      name: type,
    }, index);
  }

  /**
   * Handles model update events
   * Filters only BlockAddedEvent and BlockRemovedEvent
   * @param event - Model update event
   */
  #handleModelUpdate(event: ModelEvents): void {
    switch (true) {
      case event instanceof BlockAddedEvent:
        void this.#handleBlockAddedEvent(event);
        break;
      case event instanceof BlockRemovedEvent:
        this.#handleBlockRemovedEvent(event);
        break;
      default:
    }
  }

  /**
   * Handles BlockAddedEvent
   * - creates BlockTool instance
   * - renders its content
   * - calls UI module to render the block
   * @param event - BlockAddedEvent
   */
  async #handleBlockAddedEvent(event: BlockAddedEvent): Promise<void> {
    const { index, data } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('[BlockManager] Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const toolName = event.detail.data.name;

    const blockToolAdapter = new BlockToolAdapter(
      this.#config,
      this.#model,
      this.#eventBus,
      this.#caretAdapter,
      index.blockIndex,
      this.#formattingAdapter,
      toolName
    );

    const tool = this.#toolsManager.blockTools.get(data.name);

    if (tool === undefined) {
      throw new Error(`[BlockManager] Block Tool ${event.detail.data.name} not found`);
    }

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
      console.error(`[BlockManager] Block Tool ${data.name} failed to render`, error);
    }
  }

  /**
   * Handles BlockRemovedEvent
   *   - callse UI module to remove the block
   * @param event - BlockRemovedEvent
   */
  #handleBlockRemovedEvent(event: BlockRemovedEvent): void {
    const { data, index } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    this.#eventBus.dispatchEvent(new BlockRemovedCoreEvent({
      tool: data.name,
      index: index.blockIndex,
    }));
  }
}
