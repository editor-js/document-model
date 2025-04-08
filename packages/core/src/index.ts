import { EditorJSModel, EventType } from '@editorjs/model';
import type { ContainerInstance } from 'typedi';
import { Container } from 'typedi';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { CaretAdapter, FormattingAdapter } from '@editorjs/dom-adapters';
import type { CoreConfigValidated } from './entities/Config.js';
import type { CoreConfig } from '@editorjs/sdk';
import { BlocksManager } from './components/BlockManager.js';
import { SelectionManager } from './components/SelectionManager.js';
import { EventBus } from './components/EventBus/index.js';
import type { EditorjsPluginConstructor } from './entities/EditorjsPlugin.js';
import { EditorAPI } from './api/index.js';

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
   * Inversion of Control container for dependency injections
   */
  #iocContainer: ContainerInstance;

  /**
   * Inline tool adapter is responsible for handling model formatting updates
   * Applies format, got from inline toolbar to the model
   * When model changed with formatting event, it renders related fragment
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    this.#iocContainer = Container.of(Math.floor(Math.random() * 1e10).toString());

    this.validateConfig(config);

    this.#config = config as CoreConfigValidated;

    this.#iocContainer.set('EditorConfig', this.#config);

    this.#model = new EditorJSModel();
    this.#iocContainer.set(EditorJSModel, this.#model);

    this.#toolsManager = this.#iocContainer.get(ToolsManager);

    this.#caretAdapter = new CaretAdapter(this.#config.holder, this.#model);
    this.#iocContainer.set(CaretAdapter, this.#caretAdapter);

    this.#formattingAdapter = new FormattingAdapter(this.#model, this.#caretAdapter);
    this.#iocContainer.set(FormattingAdapter, this.#formattingAdapter);
    this.#iocContainer.get(SelectionManager);
    this.#iocContainer.get(BlocksManager);

    if (config.onModelUpdate !== undefined) {
      this.#model.addEventListener(EventType.Changed, () => {
        config.onModelUpdate?.(this.#model);
      });
    }
  }

  /**
   * Initialize and injects Plugin into the container
   * @param plugin - allows to pass any implementation of editor plugins
   */
  public use(plugin: EditorjsPluginConstructor): void {
    const eventBus = this.#iocContainer.get(EventBus);
    const pluginType = plugin.type;
    const api = this.#iocContainer.get(EditorAPI);

    const pluginInstance = new plugin({
      config: this.#config,
      api,
      eventBus,
    });

    this.#iocContainer.set(pluginType, pluginInstance);
  }

  /**
   * Initializes the core
   */
  public initialize(): void {
    const { blocks } = composeDataFromVersion2(this.#config.data ?? { blocks: [] });

    this.#toolsManager.prepareTools()
      .then(() => {
        this.#model.initializeDocument({ blocks });
      })
      .catch((error) => {
        console.error('Editor.js initialization failed', error);
      });
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

    if (config.defaultBlock === undefined) {
      config.defaultBlock = 'paragraph';
    }
  }
}

/**
 * @todo move to "sdk" package
 */
export * from './entities/index.js';
export * from './components/EventBus/index.js';
export * from './api/index.js';
export * from './tools/facades/index.js';
