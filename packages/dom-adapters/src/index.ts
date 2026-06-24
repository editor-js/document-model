import 'reflect-metadata';
import type {
  BlockToolAdapter,
  BlockTuneAdapter,
  EditorJSAdapterPlugin,
  EditorjsAdapterPluginConstructor,
  EditorjsPluginParams
} from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';
import { DOMBlockToolAdapter } from './BlockToolAdapter/index.js';
import { DOMBlockTuneAdapter } from './BlockTuneAdapter/index.js';
import { InputsRegistry } from './InputsRegistry/index.js';
import type { BlockId } from '@editorjs/model';
import { Container } from 'inversify';
import { TOKENS } from './tokens.js';
import type { CoreConfig } from '@editorjs/sdk';
import { FormattingAdapter } from './FormattingAdapter/index.js';
import { CaretAdapter } from './CaretAdapter/index.js';

export * from './CaretAdapter/index.js';
export * from './FormattingAdapter/index.js';
export * from './BlockToolAdapter/index.js';
export * from './BlockTuneAdapter/index.js';

/**
 * Plugin for the DOM adapters
 */
export class DOMAdapters implements EditorJSAdapterPlugin {
  public static type = PluginType.Adapter as const;

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
   * Map of active BlockTuneAdapter instances keyed by block id, then by tune name.
   * Used to properly destroy adapters when blocks are removed.
   */
  #tuneAdapters: Map<BlockId, Map<string, DOMBlockTuneAdapter>> = new Map();

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
    this.#iocContainer
      .bind(DOMBlockTuneAdapter)
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
   * Destroys the BlockToolAdapter for the given block.
   * Cleans up all inputs registered for the block and removes the adapter instance.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockId - unique id of the removed block
   */
  public destroyBlockToolAdapter(blockId: BlockId): void {
    const adapter = this.#adapters.get(blockId);

    if (adapter !== undefined) {
      adapter.destroy();
      this.#adapters.delete(blockId);
    }

    const registry = this.#iocContainer.get(InputsRegistry);

    registry.removeBlock(blockId);
  }

  /**
   * Creates a BlockTuneAdapter for the given block and tune name.
   * @param blockId - unique id of the block
   * @param tuneName - name of the tune
   */
  public createBlockTuneAdapter(blockId: BlockId, tuneName: string): BlockTuneAdapter {
    const adapter = this.#iocContainer.get(DOMBlockTuneAdapter);

    adapter.setBlockId(blockId);
    adapter.setTuneName(tuneName);

    if (!this.#tuneAdapters.has(blockId)) {
      this.#tuneAdapters.set(blockId, new Map());
    }

    this.#tuneAdapters.get(blockId)!.set(tuneName, adapter);

    return adapter;
  }

  /**
   * Returns the BlockTuneAdapter for the given block and tune, if one exists.
   * @param blockId - unique id of the block
   * @param tuneName - name of the tune
   */
  public getBlockTuneAdapter(blockId: BlockId, tuneName: string): BlockTuneAdapter | undefined {
    return this.#tuneAdapters.get(blockId)?.get(tuneName);
  }

  /**
   * Destroys all BlockTuneAdapters for the given block.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockId - unique id of the removed block
   */
  public destroyBlockTuneAdapters(blockId: BlockId): void {
    const tuneAdapters = this.#tuneAdapters.get(blockId);

    if (tuneAdapters !== undefined) {
      tuneAdapters.forEach(adapter => adapter.destroy());
      this.#tuneAdapters.delete(blockId);
    }
  }
}

DOMAdapters satisfies EditorjsAdapterPluginConstructor;
