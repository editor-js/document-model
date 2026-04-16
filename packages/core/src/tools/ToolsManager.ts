import 'reflect-metadata';
import { isFunction, isObject, PromiseQueue } from '@editorjs/helpers';
import { Inject, Service } from 'typedi';
import { type ToolSettings, ToolsFactory } from './ToolsFactory.js';
import type {
  EditorConfig
} from '@editorjs/editorjs';
import {
  InlineTool,
  ToolLoadedCoreEvent,
  BlockToolFacade, BlockTuneFacade,
  InlineToolFacade,
  ToolFacadeClass,
  ToolsCollection,
  EventBus,
  ToolConstructable
} from '@editorjs/sdk';

/**
 * Works with tools
 * @todo - validate tools configurations
 */
@Service()
export default class ToolsManager {
  /**
   * ToolsFactory instance
   */
  #factory: ToolsFactory;

  /**
   * Processed tools config
   */
  #config: Record<string, ToolSettings>;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Tools available for use
   */
  #availableTools = new ToolsCollection();

  /**
   * Tools loaded but unavailable for use
   */
  #unavailableTools = new ToolsCollection();

  /**
   * Returns available Tools
   */
  public get available(): ToolsCollection {
    return this.#availableTools;
  }

  /**
   * Returns unavailable Tools
   */
  public get unavailable(): ToolsCollection {
    return this.#unavailableTools;
  }

  /**
   * Return Tools for the Inline Toolbar
   */
  public get inlineTools(): ToolsCollection<InlineToolFacade> {
    return this.available.inlineTools;
  }

  /**
   * Return editor block tools
   */
  public get blockTools(): ToolsCollection<BlockToolFacade> {
    return this.available.blockTools;
  }

  /**
   * Return available Block Tunes
   * @returns - object of Inline Tool's classes
   */
  public get blockTunes(): ToolsCollection<BlockTuneFacade> {
    return this.available.blockTunes;
  }

  /**
   * @param editorConfig - EditorConfig object
   * @param editorConfig.tools - Tools configuration passed by user
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor(
    @Inject('EditorConfig') editorConfig: EditorConfig,
    eventBus: EventBus
  ) {
    this.#config = this.#prepareConfig(editorConfig.tools ?? {});
    this.#eventBus = eventBus;

    this.#validateTools();

    this.#factory = new ToolsFactory(this.#config, editorConfig, {});
  }

  /**
   * Calls tools prepare method if it exists and adds tools to relevant collection (available or unavailable tools)
   * @param tools - tools to prepare and their settings
   */
  public async prepareTools(tools: [ToolConstructable, ToolSettings][]): Promise<void> {
    const promiseQueue = new PromiseQueue();

    const setToAvailableToolsCollection = (toolName: string, tool: ToolFacadeClass): void => {
      this.#availableTools.set(toolName, tool);

      this.#eventBus.dispatchEvent(new ToolLoadedCoreEvent({
        tool,
      }));
    };

    this.#factory.setTools(tools);

    tools.forEach(([toolConstructor]) => {
      const toolName = toolConstructor.name;

      if (isFunction(toolConstructor.prepare)) {
        void promiseQueue.add(async () => {
          try {
            const tool = this.#factory.get(toolName);

            /**
             * Merged plugin `config` only (static `options().config` + `use(Tool, options).config`), aligned with `BaseToolFacade.prepare`.
             */
            await toolConstructor.prepare!({
              toolName,
              config: tool.config,
            });

            if (tool.isInline()) {
              /**
               * Some Tools validation
               */
              const inlineToolRequiredMethods = ['render'];
              const notImplementedMethods = inlineToolRequiredMethods.filter(method => tool.create()[method as keyof InlineTool] !== undefined);

              if (notImplementedMethods.length > 0) {
                /**
                 * @todo implement logger
                 */
                console.log(
                  `Incorrect Inline Tool: ${tool.name}. Some of required methods is not implemented %o`,
                  'warn',
                  notImplementedMethods
                );

                this.#unavailableTools.set(tool.name, tool);

                return;
              }
            }

            setToAvailableToolsCollection(toolName, tool);
          } catch (e) {
            console.error(`Tool ${toolName} failed to prepare`, e);

            this.#unavailableTools.set(toolName, this.#factory.get(toolName));
          }
        });
      } else {
        setToAvailableToolsCollection(toolName, this.#factory.get(toolName));
      }
    });

    await promiseQueue.completed;
  }

  /**
   * Unify tools config
   * @param config - user's tools config
   */
  #prepareConfig(config: EditorConfig['tools']): Record<string, ToolSettings> {
    const preparedConfig: Record<string, ToolSettings> = {} as Record<string, ToolSettings>;

    /**
     * Save Tools settings to a map
     */
    for (const toolName in config) {
      /**
       * If Tool is an object not a Tool's class then
       * save class and settings separately
       */
      if (isObject(config[toolName])) {
        preparedConfig[toolName] = config[toolName] as object as ToolSettings;
      } else {
        preparedConfig[toolName] = { class: config[toolName] as ToolConstructable };
      }
    }

    return preparedConfig;
  }

  /**
   * Validate Tools configuration objects and throw Error for user if it is invalid
   */
  #validateTools(): void {
    /**
     * Check Tools for a class containing
     */
    for (const toolName in this.#config) {
      if (Object.prototype.hasOwnProperty.call(this.#config, toolName)) {
        const tool = this.#config[toolName];

        if (!isFunction(tool) && !isFunction((tool).class)) {
          throw Error(
            `Tool «${toolName}» must be a constructor function or an object with function in the «class» property`
          );
        }
      }
    }
  }
}
