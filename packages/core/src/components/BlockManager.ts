import { BlockAddedEvent, BlockRemovedEvent, EditorJSModel, EventType, ModelEvents } from '@editorjs/model';
import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { EditorUI } from '../ui/Editor/index.js';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockAPI, BlockToolData } from '@editorjs/editorjs';
import { CoreConfigValidated } from '../entities/Config.js';

interface InsertBlockParameters {
  // id?: string;
  type?: string;
  data?: BlockToolData;
  index?: number;
  // needToFocus?: boolean;
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
   * Editor's UI class instance to add and remove blocks to the UI
   */
  #editorUI: EditorUI;

  /**
   * Caret Adapter instance
   * Required here to create BlockToolAdapter
   */
  #caretAdapter: CaretAdapter;

  /**
   * Tools manager instance to get block tools
   */
  #toolsManager: ToolsManager;

  #config: CoreConfigValidated;

  /**
   * BlocksManager constructor
   * All parameters are injected thorugh the IoC container
   * @param model - Editor's Document Model instance
   * @param editorUI - Editor's UI class instance
   * @param caretAdapter - Caret Adapter instance
   * @param toolsManager - Tools manager instance
   * @param config
   */
  constructor(
    model: EditorJSModel,
    editorUI: EditorUI,
    caretAdapter: CaretAdapter,
    toolsManager: ToolsManager,
    @Inject('EditorConfig') config: CoreConfigValidated
  ) {
    this.#model = model;
    this.#editorUI = editorUI;
    this.#caretAdapter = caretAdapter;
    this.#toolsManager = toolsManager;
    this.#config = config;

    this.#model.addEventListener(EventType.Changed, event => this.#handleModelUpdate(event));
  }

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
    this.#model.addBlock({
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

    const blockToolAdapter = new BlockToolAdapter(this.#model, this.#caretAdapter, index.blockIndex);

    const tool = this.#toolsManager.blockTools.get(data.name);

    if (!tool) {
      throw new Error(`[BlockManager] Block Tool ${data.name} not found`);
    }

    const block = tool.create({
      adapter: blockToolAdapter,
      data: data.data,
      block: {} as BlockAPI,
      readOnly: false,
    });

    try {
      const blockElement = await block.render();

      this.#editorUI.addBlock(blockElement, index.blockIndex);
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
    const { index } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    this.#editorUI.removeBlock(index.blockIndex);
  }
}
