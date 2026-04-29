import { CollaborationManager } from '@editorjs/collaboration-manager';
import { type DocumentId, EditorJSModel, EventType } from '@editorjs/model';
import { Container } from 'inversify';
import {
  type BlockToolConstructor,
  CoreEventType,
  EventBus,
  type InlineToolConstructor,
  PluginType,
  ToolType
} from '@editorjs/sdk';
import type { ToolSettings } from './tools/ToolsFactory';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import type { CoreConfigValidated, CoreConfig, EditorjsPluginConstructor, BlockTuneConstructor, ToolConstructable, EditorjsAdapterPluginConstructor } from '@editorjs/sdk';
import { EditorAPI } from './api/index.js';
import { generateId } from './utils/uid.js';
import { Paragraph, BoldInlineTool, LinkInlineTool, ItalicInlineTool } from './tools/internal';
import { ShortcutsPlugin } from './plugins/ShortcutsPlugin.js';
import { DOMAdapters } from '@editorjs/dom-adapters';
import { BlocksManager } from './components/BlockManager.js';
import { BlockRenderer } from './components/BlockRenderer.js';
import { SelectionManager } from './components/SelectionManager.js';
import { TOKENS } from './tokens.js';
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
   * Inversion of Control container for dependency injections
   */
  #iocContainer: Container;

  /**
   * Inversion of Control container for loaded plugins
   */
  #plugins: Container;

  /**
   * Collaboration manager
   */
  #collaborationManager: CollaborationManager;

  /**
   * @param config - Editor configuration
   */
  constructor(config: CoreConfig) {
    this.#iocContainer = new Container({ autobind: true,
      defaultScope: 'Singleton' });
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

    this.#toolsManager = this.#iocContainer.get(ToolsManager);

    this.#collaborationManager = new CollaborationManager(this.#config, this.#model);

    this.#iocContainer.bind(CollaborationManager).toConstantValue(this.#collaborationManager);

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

    this.use(Paragraph);
    this.use(BoldInlineTool);
    this.use(ItalicInlineTool);
    this.use(LinkInlineTool);
    this.use(ShortcutsPlugin);
    this.use(DOMAdapters);
  }

  /**
   * Injects Tool constructor and options into the container
   * @param tool - Tool constructor class (static `options` defines defaults merged with the second argument)
   * @param options - feature flags, `config` for the tool plugin, etc.
   */
  public use(tool: ToolConstructable, options?: Omit<ToolSettings, 'class'>): Core;
  /**
   * Injects Plugin into the container to initialize on Editor's init
   * @param plugin - allows to pass any implementation of editor plugins
   */
  public use(plugin: EditorjsPluginConstructor | EditorjsAdapterPluginConstructor): Core;
  /**
   * Overloaded method to register Editor.js Plugins/Tools/etc
   * @param pluginOrTool - entity to register
   * @param options - second argument of `use(Tool, options)` when registering a tool
   */
  public use(
    pluginOrTool: ToolConstructable | EditorjsPluginConstructor | EditorjsAdapterPluginConstructor,
    options?: Omit<ToolSettings, 'class'>
  ): Core {
    const pluginType = pluginOrTool.type;

    switch (pluginType) {
      case ToolType.Block:
      case ToolType.Inline:
      case ToolType.Tune:
        this.#plugins.bind<[ToolConstructable, ToolSettings | undefined]>(pluginType).toConstantValue([pluginOrTool as ToolConstructable, options as ToolSettings | undefined]);
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
    try {
      const { blocks } = composeDataFromVersion2(this.#config.data ?? { blocks: [] });

      this.#initializeAdapter();

      this.#initializePlugins();

      await this.#initializeTools();

      this.#iocContainer.get(SelectionManager);
      this.#iocContainer.get(BlocksManager);
      this.#iocContainer.get(BlockRenderer);

      this.#model.initializeDocument({ blocks });
      this.#collaborationManager.connect();
    } catch (error) {
      console.error('Editor.js initialization failed', error);
    }
  }

  /**
   * Initalizes loaded tools
   */
  async #initializeTools(): Promise<void> {
    const blockTools = this.#plugins.getAll<[BlockToolConstructor, ToolSettings]>(ToolType.Block);
    const inlineTools = this.#plugins.getAll<[InlineToolConstructor, ToolSettings]>(ToolType.Inline);
    const blockTunes = this.#plugins.getAll<[BlockTuneConstructor, ToolSettings]>(ToolType.Tune);

    return this.#toolsManager.prepareTools([...blockTools, ...inlineTools, ...blockTunes]);
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
   * Create instance of plugin
   * @param plugin - Plugin constructor to initialize
   */
  #initializePlugin(plugin: EditorjsPluginConstructor): void {
    const eventBus = this.#iocContainer.get(EventBus);
    const api = this.#iocContainer.get(EditorAPI);

    new plugin({
      config: this.#config,
      api,
      eventBus,
    });
  }

  /**
   * Adds adapter factory to the IoC
   */
  #initializeAdapter(): void {
    const Adapter = this.#plugins.get<EditorjsAdapterPluginConstructor>(PluginType.Adapter);

    this.#iocContainer.bind(TOKENS.Adapter)
      .toDynamicValue((ctx) => {
        const eventBus = ctx.get(EventBus);
        const api = ctx.get(EditorAPI);

        return new Adapter({
          model: this.#model,
          config: this.#config,
          api,
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
