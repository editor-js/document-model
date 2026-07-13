import { CollaborationManager } from '@editorjs/collaboration-manager';
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
  type ToolStaticOptions
} from '@editorjs/sdk';
import { composeDataFromVersion2 } from './utils/composeDataFromVersion2.js';
import ToolsManager from './tools/ToolsManager.js';
import type { CoreConfigValidated, CoreConfig, EditorjsPluginConstructor, BlockTuneConstructor, ToolConstructable, EditorjsAdapterPluginConstructor } from '@editorjs/sdk';
import { EditorAPI } from './api/index.js';
import { generateId } from './utils/uid.js';
import { Paragraph } from '@editorjs/paragraph';
import { BoldInlineTool } from '@editorjs/bold';
import { ItalicInlineTool } from '@editorjs/italic';
import { LinkInlineTool } from '@editorjs/inline-link';
import { ShortcutsPlugin } from './plugins/ShortcutsPlugin.js';
import { DOMAdapters } from '@editorjs/dom-adapters';
import { BlocksManager } from './components/BlockManager.js';
import { BlockRenderer } from './components/BlockRenderer.js';
import { SelectionManager } from './components/SelectionManager.js';
import { TOKENS } from './tokens.js';
import { UndoRedoManager } from './components/UndoRedoManager.js';
/**
 * If no holder is provided via config, the editor will be appended to the element with this id
 */
const DEFAULT_HOLDER_ID = 'editorjs';

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

    this.use(Paragraph);
    this.use(BoldInlineTool);
    this.use(ItalicInlineTool);
    this.use(LinkInlineTool);
    this.use(ShortcutsPlugin);
    this.use(CollaborationManager);
    this.use(DOMAdapters);
  }

  /**
   * Injects Tool constructor and options into the container
   * @param tool - Tool constructor class (static `options` defines defaults merged with the second argument)
   * @param options - Overrides for the tool's static `options` (toolbox, title, config, shortcuts, etc.)
   */
  public use(tool: ToolConstructable, options?: ToolStaticOptions): Core;
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
    options?: ToolStaticOptions
  ): Core {
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
    try {
      const { blocks } = composeDataFromVersion2(this.#config.data ?? { blocks: [] });

      this.#initializeAdapter();

      /**
       * Need to initialize internal modules before plugins and tools
       * @todo think of how to remove this?
       * @todo add e2e initialization tests
       * Currently only BlockRenderer would be enough, but that would be hard to debug. Easier just add every module here
       */
      this.#iocContainer.get(SelectionManager);
      this.#iocContainer.get(BlocksManager);
      this.#iocContainer.get(BlockRenderer);
      this.#iocContainer.get(UndoRedoManager);

      this.#initializePlugins();
      await this.#initializeTools();

      this.#model.initializeDocument({ blocks });

      const eventBus = this.#iocContainer.get(EventBus);

      eventBus.dispatchEvent(new CoreEventBase(CoreEventType.Ready, undefined));
    } catch (error) {
      console.error('Editor.js initialization failed', error);
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
   * Create instance of plugin
   * @param plugin - Plugin constructor to initialize
   */
  #initializePlugin(plugin: EditorjsPluginConstructor): void {
    const eventBus = this.#iocContainer.get(EventBus);
    const apiFactory = this.#iocContainer.get<Factory<EditorAPI>>(TOKENS.EditorAPIFactory) as () => EditorAPI;

    new plugin({
      config: this.#config,
      api: apiFactory(),
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
