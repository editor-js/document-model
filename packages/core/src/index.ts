import type { ModelEvents } from '@editorjs/model';
import { BlockAddedEvent, EditorJSModel, EventType } from '@editorjs/model';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { BlockToolAdapter, CaretAdapter, InlineToolsAdapter } from '@editorjs/dom-adapters';
import type { BlockAPI, BlockToolData, API as EditorjsApi, ToolConfig } from '@editorjs/editorjs';
import { InlineToolbar } from './ui/InlineToolbar/index.js';
import type { CoreConfigValidated } from './entities/Config.js';
import type { BlockTool, CoreConfig } from '@editorjs/sdk';

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

  /**
   * Inline tool adapter is responsible for handling model formatting updates
   * Applies format, got from inline toolbar to the model
   * When model changed with formatting event, it renders related fragment
   */
  #inlineToolsAdapter: InlineToolsAdapter;

  /**
   * @todo inline toolbar should subscripe on selection change event called by EventBus
   * Inline toolbar is responsible for handling selection changes
   * When model selection changes, it determines, whenever to show toolbar element,
   * Which calls apply format method of the adapter
   */
  #inlineToolbar: InlineToolbar;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.validateConfig(config);
    this.#config = config as CoreConfigValidated;

    const { blocks } = composeDataFromVersion2(config.data ?? { blocks: [] });

    this.#model = new EditorJSModel();
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.handleModelUpdate(event));

    this.#toolsManager = new ToolsManager(this.#config.tools);
    this.#caretAdapter = new CaretAdapter(this.#config.holder, this.#model);
    this.#inlineToolsAdapter = new InlineToolsAdapter(this.#model, this.#caretAdapter);

    this.#inlineToolbar = new InlineToolbar(this.#model, this.#inlineToolsAdapter, this.#toolsManager.getInlineTools(), this.#config.holder);

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
    const tool = this.#toolsManager.resolveBlockTool(name);
    const block = new tool({
      adapter: blockToolAdapter,
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

export * from './entities/index.js';
