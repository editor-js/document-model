import type { ModelEvents } from '@editorjs/model';
import { BlockAddedEvent, EditorJSModel, EventType } from '@editorjs/model';
import type { ContainerInstance } from 'typedi';
import { Container } from 'typedi';
import type { CoreConfig, CoreConfigValidated } from './entities/Config.js';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import type { BlockAPI, BlockToolData, API as EditorjsApi, ToolConfig } from '@editorjs/editorjs';
import type { BlockTool } from './entities/BlockTool.js';

/**
 * If no holder is provided via config, the editor will be appended to the element with this id
 */
const DEFAULT_HOLDER_ID = 'editorjs';

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
   * Caret adapter is responsible for handling caret position and selection
   */
  #caretAdapter: CaretAdapter;

  #iocContainer: ContainerInstance;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.#iocContainer = Container.of(Math.floor(Math.random() * 1e10).toString());

    this.validateConfig(config);
    this.#config = config as CoreConfigValidated;

    this.#iocContainer.set('EditorConfig', this.#config);

    const { blocks } = composeDataFromVersion2(config.data ?? { blocks: [] });

    this.#model = new EditorJSModel();

    this.#iocContainer.set(EditorJSModel, this.#model);

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.handleModelUpdate(event));

    this.#toolsManager = this.#iocContainer.get(ToolsManager);

    this.#caretAdapter = new CaretAdapter(this.#config.holder, this.#model);

    this.#iocContainer.set(CaretAdapter, this.#caretAdapter);

    this.#model.initializeDocument({ blocks });
  }

  /**
   * Validate configuration
   * @param config - Editor configuration
   */
  private validateConfig(config: CoreConfig): void {
    if (config.holder === undefined) {
      const holder = document.getElementById(DEFAULT_HOLDER_ID);

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
   * When model emits block-added event, add an actual block to the editor
   * @param event - Any model event
   */
  private handleModelUpdate(event: ModelEvents): void {
    if (event instanceof BlockAddedEvent === false) {
      return;
    }

    void this.handleBlockAdded(event);
  }

  /**
   * Insert block added to the model to the DOM
   * @param event - Event containing information about the added block
   */
  private async handleBlockAdded(event: BlockAddedEvent): Promise<void> {
    /**
     * @todo add batch rendering to improve performance on large documents
     */
    const index = event.detail.index;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const blockToolAdapter = new BlockToolAdapter(this.#model, this.#caretAdapter, index.blockIndex);

    const block = this.createBlock({
      name: event.detail.data.name,
      data: event.detail.data.data,
    }, blockToolAdapter);

    const blockEl = await block.render();

    /**
     * @todo add block to the correct position
     */
    this.#config.holder.appendChild(blockEl);
  }

  /**
   * Create Block Tools instance
   * @param blockOptions - options to pass to the tool
   * @param blockToolAdapter - adapter for linking block and model
   */
  private createBlock({ name, data }: {
    /**
     * Tool name
     */
    name: string;
    /**
     * Saved block data
     */
    data: BlockToolData<Record<string, unknown>>;
  }, blockToolAdapter: BlockToolAdapter): BlockTool {
    const tool = this.#toolsManager.blockTools.get(name);

    if (!tool) {
      throw new Error(`Block Tool ${name} not found`);
    }

    const block = tool.create({
      adapter: blockToolAdapter,
      data: data,
      block: {} as BlockAPI,
      readOnly: false,
    });

    return block;
  }
}
