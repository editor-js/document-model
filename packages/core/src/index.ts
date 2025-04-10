import { CollaborationManager } from '@editorjs/collaboration-manager';
import { type DocumentId, EditorJSModel, EventType } from '@editorjs/model';
import type { ContainerInstance } from 'typedi';
import { Container } from 'typedi';
import { CoreEventType, EventBus, UiComponentType } from '@editorjs/sdk';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import { CaretAdapter, FormattingAdapter } from '@editorjs/dom-adapters';
import type { CoreConfigValidated, CoreConfig, EditorjsPluginConstructor } from '@editorjs/sdk';
import { BlocksManager } from './components/BlockManager.js';
import { SelectionManager } from './components/SelectionManager.js';
import { EditorAPI } from './api/index.js';
import { generateId } from './utils/uid.js';

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
   * Collaboration manager
   */
  #collaborationManager: CollaborationManager;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    this.#iocContainer = Container.of(Math.floor(Math.random() * 1e10).toString());

    this.validateConfig(config);

    this.#config = config as CoreConfigValidated;

    if (this.#config.userId === undefined) {
      this.#config.userId = generateId();
    }

    if (this.#config.documentId === undefined) {
      this.#config.documentId = generateId();
    }

    this.#iocContainer.set('EditorConfig', this.#config);

    const eventBus = new EventBus();

    this.#iocContainer.set(EventBus, eventBus);

    this.#model = new EditorJSModel(this.#config.userId, { identifier: this.#config.documentId as DocumentId });

    this.#iocContainer.set(EditorJSModel, this.#model);

    this.#toolsManager = this.#iocContainer.get(ToolsManager);

    this.#caretAdapter = new CaretAdapter(this.#config, this.#config.holder, this.#model);
    this.#iocContainer.set(CaretAdapter, this.#caretAdapter);

    this.#collaborationManager = new CollaborationManager(this.#config, this.#model);

    this.#iocContainer.set(CollaborationManager, this.#collaborationManager);

    this.#formattingAdapter = new FormattingAdapter(this.#config, this.#model, this.#caretAdapter);

    this.#iocContainer.set(FormattingAdapter, this.#formattingAdapter);
    this.#iocContainer.get(SelectionManager);
    this.#iocContainer.get(BlocksManager);

    if (config.onModelUpdate !== undefined) {
      this.#model.addEventListener(EventType.Changed, () => {
        config.onModelUpdate?.(this.#model);
      });
    }

    eventBus.addEventListener(`core:${CoreEventType.Undo}`, () => {
      this.#collaborationManager.undo();
    });

    eventBus.addEventListener(`core:${CoreEventType.Redo}`, () => {
      this.#collaborationManager.redo();
    });
  }

  /**
   * Initialize and injects Plugin into the container
   * @param plugin - allows to pass any implementation of editor plugins
   */
  public use(plugin: EditorjsPluginConstructor): Core {
    const pluginType = plugin.type;

    this.#iocContainer.set(pluginType, plugin);

    return this;
  }

  /**
   * Initializes the core
   */
  public initialize(): void {
    const { blocks } = composeDataFromVersion2(this.#config.data ?? { blocks: [] });

    this.initializePlugins();

    this.#toolsManager.prepareTools()
      .then(() => {
        this.#model.initializeDocument({ blocks });
      })
      .then(() => {
        this.#collaborationManager.connect();
      })
      .catch((error) => {
        console.error('Editor.js initialization failed', error);
      });
  }

  /**
   * Initialize all registered UI plugins
   */
  private initializePlugins(): void {
    /**
     * Get all registered plugin types from the container
     */
    const pluginTypes = Object.values(UiComponentType);

    for (const pluginType of pluginTypes) {
      const plugin = this.#iocContainer.get<EditorjsPluginConstructor>(pluginType);

      if (plugin !== undefined && typeof plugin === 'function') {
        this.initializePlugin(plugin);
      }
    }
  }

  /**
   * Create instance of plugin
   * @param plugin - Plugin constructor to initialize
   */
  private initializePlugin(plugin: EditorjsPluginConstructor): void {
    const eventBus = this.#iocContainer.get(EventBus);
    const api = this.#iocContainer.get(EditorAPI);

    new plugin({
      config: this.#config,
      api,
      eventBus,
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

    if (config.data !== undefined) {
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
