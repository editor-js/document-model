import type {
  BlockToolConstructor,
  UnifiedToolConfig
} from '@editorjs/sdk';
import 'reflect-metadata';
import { deepMerge, isFunction, isObject, PromiseQueue } from '@editorjs/helpers';
import { Inject, Service } from 'typedi';
import { ToolsFactory } from './ToolsFactory.js';
import { Paragraph } from './internal/block-tools/paragraph/index.js';
import type {
  EditorConfig,
  ToolConstructable,
  ToolSettings
} from '@editorjs/editorjs';
import {
  InlineTool,
  InlineToolConstructor,
  ToolLoadedCoreEvent,
  BlockToolFacade, BlockTuneFacade,
  InlineToolFacade,
  ToolFacadeClass,
  ToolsCollection,
  EventBus
} from '@editorjs/sdk';
import BoldInlineTool from './internal/inline-tools/bold/index.js';
import ItalicInlineTool from './internal/inline-tools/italic/index.js';
import LinkInlineTool from './internal/inline-tools/link/index.js';

/**
 * Works with tools
 * @todo - validate tools configurations
 * @todo - merge internal tools
 */
@Service()
export default class ToolsManager {
  #tools: EditorConfig['tools'];

  /**
   * ToolsFactory instance
   */
  #factory: ToolsFactory;

  /**
   * Unified config with internal and internal tools
   */
  #config: UnifiedToolConfig;

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
   * Returns internal tools
   */
  public get internal(): ToolsCollection {
    return this.available.internalTools;
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
   * @returns Promise<void>
   */
  public async prepareTools(): Promise<void> {
    const promiseQueue = new PromiseQueue();

    const setToAvailableToolsCollection = (toolName: string, tool: ToolFacadeClass): void => {
      this.#availableTools.set(toolName, tool);

      this.#eventBus.dispatchEvent(new ToolLoadedCoreEvent({
        tool,
      }));
    };

    Object.entries(this.#config).forEach(([toolName, config]) => {
      if (isFunction(config.class.prepare)) {
        void promiseQueue.add(async () => {
          try {
            /**
             * TypeScript doesn't get type guard here, so non-null assertion is used
             */
            await config.class.prepare!({
              toolName: toolName,
              config: config,
            });

            const tool = this.#factory.get(toolName);

            if ('isInline' in tool && tool.isInline()) {
              /**
               * Some Tools validation
               */
              const inlineToolRequiredMethods = ['render'];
              const notImplementedMethods = inlineToolRequiredMethods.filter(method => tool.create()[method as keyof InlineTool] !== undefined);

              if (notImplementedMethods.length) {
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
  #prepareConfig(config: EditorConfig['tools']): UnifiedToolConfig {
    const unifiedConfig: UnifiedToolConfig = {} as UnifiedToolConfig;

    /**
     * Save Tools settings to a map
     */
    for (const toolName in config) {
      /**
       * If Tool is an object not a Tool's class then
       * save class and settings separately
       */
      if (isObject(config)) {
        unifiedConfig[toolName] = config[toolName] as UnifiedToolConfig[string];
      } else {
        unifiedConfig[toolName] = { class: config[toolName] as ToolConstructable };
      }
    }

    deepMerge(unifiedConfig, this.#internalTools);

    return unifiedConfig;
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
        // if (toolName in this.internalTools) {
        //   return;
        // }

        const tool = this.#config[toolName];

        if (!isFunction(tool) && !isFunction((tool as ToolSettings).class)) {
          throw Error(
            `Tool «${toolName}» must be a constructor function or an object with function in the «class» property`
          );
        }
      }
    }
  }

  /**
   * Returns internal tools
   * Includes Bold, Italic, Link and Paragraph
   */
  get #internalTools(): UnifiedToolConfig {
    return {
      paragraph: {
        /**
         * @todo solve problems with types
         */
        class: Paragraph as unknown as BlockToolConstructor,
        inlineToolbar: true,
        isInternal: true,
      },
      bold: {
        class: BoldInlineTool as unknown as InlineToolConstructor,
        isInternal: true,
      },
      italic: {
        class: ItalicInlineTool as unknown as InlineToolConstructor,
        isInternal: true,
      },
      link: {
        class: LinkInlineTool as unknown as InlineToolConstructor,
        isInternal: true,
      },
    };
  }
}
