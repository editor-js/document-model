import { EditorJSModel } from '@editorjs/model';
import type { Factory } from 'inversify';
import { Container } from 'inversify';
import {
  type BlockToolConstructor,
  type DocumentId,
  CoreEventType,
  CoreEventBase,
  EventBus,
  EventType,
  type InlineToolConstructor,
  PluginType,
  ToolType,
  type ToolStaticOptions,
  type PluginId,
  type EditorjsPlugin,
  type EditorJSAdapterPlugin
} from '@editorjs/sdk';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import type { CoreConfigValidated, CoreConfig, EditorjsPluginConstructor, BlockTuneConstructor, ToolConstructable, EditorjsAdapterPluginConstructor } from '@editorjs/sdk';
import { EditorAPI } from './api/index.js';
import { generateId } from './utils/uid.js';
import { BlocksManager } from './components/BlockManager.js';
import { BlockRenderer } from './components/BlockRenderer.js';
import { SelectionManager } from './components/SelectionManager.js';
import { TOKENS } from './tokens.js';
import { UndoRedoManager } from './components/UndoRedoManager.js';
import { PluginRegistry } from './components/PluginRegistry.js';

/**
 * If no holder is provided via config, the editor will be appended to the element with this id
 */
const DEFAULT_HOLDER_ID = 'editorjs';

/**
 * Plugin instance created by Core, with the name its public API is registered under
 */
interface PluginInstance {
  /**
   * Plugin's static name
   */
  name: PluginId;

  /**
   * Plugin instance
   */
  instance: EditorjsPlugin;
}

/**
 * Core services that hold listeners or resources and need teardown
 */
interface CoreServices {
  /**
   * Tracks the caret and applies inline tools
   */
  selectionManager?: SelectionManager;

  /**
   * Renders blocks and owns their tool instances
   */
  blockRenderer?: BlockRenderer;

  /**
   * Local undo/redo history
   */
  undoRedoManager?: UndoRedoManager;

  /**
   * Rendering adapter plugin
   */
  adapter?: EditorJSAdapterPlugin;
}

/**
 * Editor entry point
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
   * Editor configuration
   */
  #config: CoreConfigValidated;

  /**
   * Inversion of Control container for dependency injections
   */
  #iocContainer: Container;

  /**
   * Inversion of Control container for loaded plugins
   */
  #plugins: Container;

  /**
   * Plugin instances in construction order, destroyed in reverse order
   */
  #pluginInstances: PluginInstance[] = [];

  /**
   * Core services resolved during initialization, destroyed by {@link destroy}.
   * Kept here so teardown never resolves a service that initialization didn't reach
   */
  #services: CoreServices = {};

  /**
   * Set by {@link destroy}. A destroyed core can't be used or initialized again
   */
  #destroyed = false;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.#iocContainer = new Container({
      autobind: true,
      defaultScope: 'Singleton',
    });
    this.#plugins = new Container();

    this.#validateConfig(config);

    this.#config = config as CoreConfigValidated;

    if (this.#config.userId === undefined) {
      this.#config.userId = generateId();
    }

    if (this.#config.documentId === undefined) {
      this.#config.documentId = generateId();
    }

    this.#iocContainer.bind(TOKENS.EditorConfig).toConstantValue(this.#config);

    const eventBus = new EventBus();

    this.#iocContainer.bind(EventBus).toConstantValue(eventBus);

    this.#model = new EditorJSModel(this.#config.userId, { identifier: this.#config.documentId as DocumentId });

    this.#iocContainer.bind(EditorJSModel).toConstantValue(this.#model);

    /**
     * Bind EditorAPI factory so components can request the API avoiding circular dependencies
     * ToolsManager is an example: it needs API to provide it to the Tools, but being a dependency to BlocksManager which is a dependency to API
     */
    this.#iocContainer.bind<Factory<EditorAPI>>(TOKENS.EditorAPIFactory)
      .toFactory(ctx => () => ctx.get<EditorAPI>(EditorAPI));

    if (config.onModelUpdate !== undefined) {
      this.#model.addEventListener(EventType.Changed, () => {
        config.onModelUpdate?.(this.#model);
      });
    }
  }

  /**
   * Injects Tool constructor and options into the container
   * @param tool - Tool constructor class (static `options` defines defaults merged with the second argument)
   * @param options - Overrides for the tool's static `options` (toolbox, title, config, shortcuts, etc.)
   */
  public use(tool: ToolConstructable, options?: ToolStaticOptions): Core;
  /**
   * Injects Plugin into the container to initialize on Editor's init
   *
   * The plugin's id is inferred from its static `name`, which types its `publicApi` against
   * `EditorjsPluginApiMap`. A plugin that omits the declaration widens the id to `string`,
   * making any declared `publicApi` a compile error here.
   * @param plugin - allows to pass any implementation of editor plugins
   */
  public use<Id extends PluginId>(plugin: EditorjsPluginConstructor<Id> | EditorjsAdapterPluginConstructor<Id>): Core;
  /**
   * Overloaded method to register Editor.js Plugins/Tools/etc
   * @param pluginOrTool - entity to register
   * @param options - second argument of `use(Tool, options)` when registering a tool
   */
  public use(
    pluginOrTool: ToolConstructable | EditorjsPluginConstructor | EditorjsAdapterPluginConstructor,
    options?: ToolStaticOptions
  ): Core {
    this.#assertNotDestroyed();

    const pluginType = pluginOrTool.type;

    switch (pluginType) {
      case ToolType.Block:
      case ToolType.Inline:
      case ToolType.Tune:
        this.#plugins.bind<[ToolConstructable, ToolStaticOptions | undefined]>(pluginType).toConstantValue([pluginOrTool as ToolConstructable, options]);
        break;
      case PluginType.Adapter:
        if (this.#plugins.isBound(PluginType.Adapter)) {
          this.#plugins.rebind(PluginType.Adapter).toConstantValue(pluginOrTool);
        } else {
          this.#plugins.bind(PluginType.Adapter).toConstantValue(pluginOrTool);
        }
        break;
      default:
        this.#plugins.bind(PluginType.Plugin).toConstantValue(pluginOrTool);
    }

    return this;
  }

  /**
   * Initializes the core
   */
  public async initialize(): Promise<void> {
    this.#assertNotDestroyed();
    this.#validatePreconditions();

    const { blocks } = composeDataFromVersion2(this.#config.data ?? { blocks: [] });

    this.#initializeAdapter();

    /**
     * Need to initialize internal modules before plugins and tools
     * @todo think of how to remove this?
     * @todo add e2e initialization tests
     * Currently only BlockRenderer would be enough, but that would be hard to debug. Easier just add every module here
     */
    this.#services.selectionManager = this.#iocContainer.get(SelectionManager);
    this.#iocContainer.get(BlocksManager);
    this.#services.blockRenderer = this.#iocContainer.get(BlockRenderer);
    this.#services.adapter = this.#iocContainer.get<EditorJSAdapterPlugin>(TOKENS.Adapter);

    this.#initializePlugins();
    await this.#initializeTools();

    /**
     * destroy() was called while tools were being prepared: it already tore down what exists
     */
    if (this.#destroyed) {
      return;
    }

    /**
     * UndoRedoManager should go after plugins as it uses defaultPrevented on undo/redo events which can be set by plugins
     * @todo Figure out how to make initialization less complex
     */
    this.#services.undoRedoManager = this.#iocContainer.get(UndoRedoManager);

    this.#model.initializeDocument({ blocks });

    const eventBus = this.#iocContainer.get(EventBus);

    eventBus.dispatchEvent(new CoreEventBase(CoreEventType.Ready, undefined));
  }

  /**
   * Tears the editor down: plugins in reverse construction order, core services, rendered blocks, and the adapter.
   * The document model is left untouched, so no removal reaches undo history or collaboration.
   * Safe to call more than once and while {@link initialize} is pending. After it, `use()` and `initialize()` throw
   */
  public destroy(): void {
    /**
     * Plugin instances and services are cleared below, so a second call finds nothing left to destroy
     */
    this.#destroyed = true;

    const registry = this.#iocContainer.get(PluginRegistry);

    for (const { name, instance } of this.#pluginInstances.reverse()) {
      this.#safely(`plugin "${name}"`, () => instance.destroy?.());
      registry.unregister(name);
    }

    this.#pluginInstances = [];

    const { undoRedoManager, selectionManager, blockRenderer, adapter } = this.#services;

    this.#safely('UndoRedoManager', () => undoRedoManager?.destroy());
    this.#safely('SelectionManager', () => selectionManager?.destroy());
    this.#safely('BlockRenderer', () => blockRenderer?.destroy());
    this.#safely('adapter', () => adapter?.destroy?.());

    this.#services = {};
  }

  /**
   * Runs one teardown step, logging its error so the remaining steps still run
   * @param label - what is being destroyed, for the log
   * @param step - teardown step
   */
  #safely(label: string, step: () => void): void {
    try {
      step();
    } catch (error) {
      console.error(`[Core] Failed to destroy ${label}`, error);
    }
  }

  /**
   * Throws if {@link destroy} has been called
   */
  #assertNotDestroyed(): void {
    if (this.#destroyed) {
      throw new Error('Editor has been destroyed. Create a new instance instead');
    }
  }

  /**
   * Validates that the caller has registered everything the headless engine needs before booting.
   * Throws with a clear message instead of failing deep inside module resolution.
   */
  #validatePreconditions(): void {
    if (!this.#plugins.isBound(PluginType.Adapter)) {
      throw new Error(
        'No rendering adapter registered. Register one via `.use()` (e.g. DOMAdapters), or use the `@editorjs/editorjs` package which bundles it.'
      );
    }

    const defaultBlock = this.#config.defaultBlock;
    const blockToolNames = this.#plugins.isBound(ToolType.Block)
      ? this.#plugins
          .getAll<[BlockToolConstructor, ToolStaticOptions | undefined]>(ToolType.Block)
          .map(([tool]) => tool.name)
      : [];

    if (!blockToolNames.includes(defaultBlock)) {
      throw new Error(
        `Default block tool "${defaultBlock}" is not registered. Register it via \`.use()\`, or set \`defaultBlock\` to a registered block tool.`
      );
    }
  }

  /**
   * Initializes loaded tools
   */
  async #initializeTools(): Promise<void> {
    const blockTools = this.#plugins.getAll<[BlockToolConstructor, ToolStaticOptions | undefined]>(ToolType.Block);
    const inlineTools = this.#plugins.getAll<[InlineToolConstructor, ToolStaticOptions | undefined]>(ToolType.Inline);
    const blockTunes = this.#plugins.getAll<[BlockTuneConstructor, ToolStaticOptions | undefined]>(ToolType.Tune);

    const toolsManager = this.#iocContainer.get(ToolsManager);

    return toolsManager.prepareTools([...blockTools, ...inlineTools, ...blockTunes]);
  }

  /**
   * Initialize all registered UI plugins (see {@link PluginType.Plugin}).
   */
  #initializePlugins(): void {
    const plugins = this.#plugins.isBound(PluginType.Plugin)
      ? this.#plugins.getAll<EditorjsPluginConstructor>(PluginType.Plugin)
      : [];

    for (const PluginCtor of plugins) {
      this.#initializePlugin(PluginCtor);
    }
  }

  /**
   * Create instance of plugin and register the public API it exposes
   * @param plugin - Plugin constructor to initialize
   */
  #initializePlugin(plugin: EditorjsPluginConstructor): void {
    const eventBus = this.#iocContainer.get(EventBus);
    const apiFactory = this.#iocContainer.get<Factory<EditorAPI>>(TOKENS.EditorAPIFactory) as () => EditorAPI;

    const instance = new plugin({
      config: this.#config,
      api: apiFactory(),
      eventBus,
    });

    this.#pluginInstances.push({ name: plugin.name,
      instance });

    if (instance.publicApi !== undefined) {
      this.#iocContainer.get(PluginRegistry).register(plugin.name, instance.publicApi);
    }
  }

  /**
   * Adds adapter factory to the IoC
   */
  #initializeAdapter(): void {
    const Adapter = this.#plugins.get<EditorjsAdapterPluginConstructor>(PluginType.Adapter);

    this.#iocContainer.bind(TOKENS.Adapter)
      .toDynamicValue((ctx) => {
        const eventBus = ctx.get(EventBus);
        const apiFactory = ctx.get<Factory<EditorAPI>>(TOKENS.EditorAPIFactory) as () => EditorAPI;

        return new Adapter({
          config: this.#config,
          api: apiFactory(),
          eventBus,
        });
      })
      .inSingletonScope();
  }

  /**
   * Validate configuration
   * @param config - Editor configuration
   */
  #validateConfig(config: CoreConfig): void {
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
