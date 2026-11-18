import 'reflect-metadata';
import type {
  BlockToolAdapter,
  EditorJSAdapterPlugin,
  EditorjsAdapterPluginConstructor,
  EditorjsPluginParams
} from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';
import { DOMBlockToolAdapter } from './BlockToolAdapter/index.js';
import { InputsRegistry } from './InputsRegistry/index.js';
import type { BlockId } from '@editorjs/sdk';
import { Container } from 'inversify';
import { TOKENS } from './tokens.js';
import type { CoreConfig } from '@editorjs/sdk';
import { FormattingAdapter } from './FormattingAdapter/index.js';
import { CaretAdapter } from './CaretAdapter/index.js';

export * from './CaretAdapter/index.js';
export * from './FormattingAdapter/index.js';
export * from './BlockToolAdapter/index.js';

/**
 * Plugin for the DOM adapters
 */
export class DOMAdapters implements EditorJSAdapterPlugin {
  public static type = PluginType.Adapter as const;

  /**
   * Plugin name used to identify the adapter across the editor
   */
  public static readonly name = 'dom-adapters';

  #iocContainer: Container = new Container({
    autobind: true,
    defaultScope: 'Singleton',
  });

  /**
   * Map of active BlockToolAdapter instances keyed by block id.
   * Used to properly destroy adapters (remove their event listeners) when blocks are removed.
   */
  #adapters: Map<BlockId, DOMBlockToolAdapter> = new Map();

  /**
   * @param params - Plugin parameters
   * @param params.config - Editor's config
   * @param params.api - Editor's API
   * @param params.eventBus - EventBus instance
   */
  constructor({ config, api, eventBus }: EditorjsPluginParams) {
    this.#iocContainer.bind<Required<CoreConfig>>(TOKENS.EditorConfig).toConstantValue(config as Required<CoreConfig>);
    this.#iocContainer.bind(EventBus).toConstantValue(eventBus);
    this.#iocContainer.bind(TOKENS.EditorAPI).toConstantValue(api);
    this.#iocContainer
      .bind(DOMBlockToolAdapter)
      .toSelf()
      .inTransientScope();

    /**
     * Initialize singleton adapters
     */
    this.#iocContainer.get(FormattingAdapter);
    this.#iocContainer.get(CaretAdapter);
  }

  /**
   * Creates a BlockToolAdapter for the block with the given id.
   * @param blockId - unique id of the block being inserted
   * @param toolName - name of the tool for this block
   */
  public createBlockToolAdapter(blockId: BlockId, toolName: string): BlockToolAdapter {
    const registry = this.#iocContainer.get(InputsRegistry);

    registry.insertBlock(blockId);

    const adapter = this.#iocContainer.get(DOMBlockToolAdapter);

    adapter.setBlockId(blockId);
    adapter.setToolName(toolName);

    this.#adapters.set(blockId, adapter);

    return adapter;
  }

  /**
   * Destroys every block adapter still alive, then stops the caret and formatting adapters.
   * Called by Core after every rendered block has been released.
   *
   * Each step is logged if it throws and the rest still run: a caret adapter left alive would keep
   * the holder subscribed to the page-wide selection watcher
   */
  public destroy(): void {
    for (const blockId of [...this.#adapters.keys()]) {
      this.#safely(`the adapter of block ${blockId}`, () => this.destroyBlockToolAdapter(blockId));
    }

    this.#safely('CaretAdapter', () => this.#iocContainer.get(CaretAdapter).destroy());
    this.#safely('FormattingAdapter', () => this.#iocContainer.get(FormattingAdapter).destroy());
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
      console.error(`[DOMAdapters] Failed to destroy ${label}`, error);
    }
  }

  /**
   * Destroys the BlockToolAdapter for the given block.
   * Cleans up all inputs registered for the block and removes the adapter instance.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockId - unique id of the removed block
   */
  public destroyBlockToolAdapter(blockId: BlockId): void {
    const adapter = this.#adapters.get(blockId);

    /**
     * Released before its destroy() runs, so a throwing adapter isn't kept, or destroyed again
     */
    this.#adapters.delete(blockId);

    try {
      adapter?.destroy();
    } finally {
      this.#iocContainer.get(InputsRegistry).removeBlock(blockId);
    }
  }
}

DOMAdapters satisfies EditorjsAdapterPluginConstructor;
