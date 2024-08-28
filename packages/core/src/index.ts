import type { ModelEvents } from '@editorjs/model';
import { BlockAddedEvent, EditorJSModel, EventType } from '@editorjs/model';
import type { CoreConfig, CoreConfigValidated } from './entities/Config.js';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import type { BlockAPI, BlockToolData, API as EditorjsApi, ToolConfig } from '@editorjs/editorjs';
import type { BlockTool } from './entities/BlockTool.js';

/**
 * Editor entry poit
 * - initializes Model
 * - subscribes to model updates
 * - creates Adapters for Tools
 * - creates Tools
 * - adds Blocks accodring to model updates
 */
export default class Core {
  /**
   * Editor's Document Model
   */
  #model: EditorJSModel;

  /**
   * Tools manager is responsible for creating tools
   */
  #toolsManager: ToolsManager;

  /**
   * Editor configuration
   */
  #config: CoreConfigValidated;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.validateConfig(config);
    this.#config = config as CoreConfigValidated;

    this.#toolsManager = new ToolsManager(config.tools);

    const { blocks } = composeDataFromVersion2(config.data ?? { blocks: [] });

    this.#model = new EditorJSModel();
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event));
    this.#model.initializeDocument({ blocks });
  }

  /**
   * Validate configuration
   * @param config - Editor configuration
   */
  private validateConfig(config: CoreConfig): void {
    if (config.holder === undefined) {
      const holder = document.getElementById('editorjs');

      if (holder) {
        config.holder = holder;
      } else {
        throw new Error('Editor configuration should contain holder or #editorjs element should be present');
      }
    }

    if (config.data) {
      if (config.data.blocks === undefined) {
        throw new Error('Editor configuration should contain blocks');
      }

      if (!Array.isArray(config.data.blocks)) {
        throw new Error('Editor configuration blocks should be an array');
      }
    }
  }

  /**
   * Handle model update
   * @param event - Model event
   */
  #handleModelUpdate(event: ModelEvents): void {
    if (event instanceof BlockAddedEvent === false) {
      return;
    }

    void this.#handleBlockAdded(event);
  }

  /**
   * Insert block added to the model to the DOM
   * @param event - Block added event
   */
  async #handleBlockAdded(event: BlockAddedEvent): Promise<void> {
    /**
     * @todo add batch rendering to improve performance on large documents
     */
    const index = event.detail.index;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined');
    }

    const caretAdapter = new CaretAdapter(this.#config.holder, this.#model);
    const blockToolAdapter = new BlockToolAdapter(this.#model, caretAdapter, index.blockIndex);

    const block = this.#createBlock({
      name: event.detail.data.name,
      data: event.detail.data.data,
    }, blockToolAdapter);

    const blockEl = await block.render();

    (this.#config.holder).appendChild(blockEl);
  }

  /**
   * Create Block Tools instance
   * @param blockOptions - options to pass to the tool
   * @param blockToolAdapter - adapter for linking block and model
   */
  #createBlock({ name, data }: {
    /**
     * Tool name
     */
    name: string;
    /**
     * Saved block data
     */
    data: BlockToolData<Record<string, unknown>>;
  }, blockToolAdapter: BlockToolAdapter): BlockTool {
    const tool = this.#toolsManager.resolveBlockTool(name);
    const block = new tool({
      blockToolAdapter,
      data: data,

      // @todo
      api: {} as EditorjsApi,
      config: {} as ToolConfig<Record<string, unknown>>,
      block: {} as BlockAPI,
      readOnly: false,
    });

    return block;
  }
}
