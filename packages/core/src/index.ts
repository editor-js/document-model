import type { ModelEvents } from '@editorjs/model';
import { BlockAddedEvent, EditorJSModel, EventType } from '@editorjs/model';
import type { CoreConfig } from './entities/Config.js';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { BlockToolAdapter } from '@editorjs/dom-adapters';
import { Paragraph } from './tools/internal/paragraph/index.js';
import type { API as EditorjsApi } from '@editorjs/editorjs';

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
  #config: CoreConfig;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.validateConfig(config);

    this.#config = config;
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
      throw new Error('Editor configuration should contain holder');
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

    this.#handleBlockAdded(event);
  }

  /**
   * Handle block added event
   * @param event - Block added event
   */
  #handleBlockAdded(event: BlockAddedEvent): void {
    /**
     * @todo add batch rendering to improve performance on large documents
     */
    console.log('Block added', event);

    const index = event.detail.index;
    const [blockIndex] = index;
    // const tool = this.#toolsManager.resolveBlockTool(event.detail.data.name);
    const tool = Paragraph;
    const adapter = new BlockToolAdapter(this.#model, blockIndex);

    const block = new tool({
      blockToolAdapter: adapter,
      api: {} as any,
      config: {} as any,
      data: event.detail.data.data,
      block: {} as any,
      readOnly: false,
    });

    const blockEl = block.render();

    console.log('blockEl', blockEl, this.#config.holder);

    (this.#config.holder as HTMLElement).appendChild(blockEl);
  }
}
