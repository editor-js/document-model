import type {
  BlockToolAdapter,
  EditorJSAdapterPlugin, EditorjsAdapterPluginConstructor,
  EditorjsAdapterPluginParams
} from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';
import { DOMBlockToolAdapter } from './BlockToolAdapter/index.js';
import { InputsRegistry } from './InputsRegistry/index.js';
import { EditorJSModel } from '@editorjs/model';
import { Container } from 'inversify';
import { TOKENS } from './tokens.js';
import type { CoreConfig } from '@editorjs/sdk';

export * from './CaretAdapter/index.js';
export * from './FormattingAdapter/index.js';
export * from './BlockToolAdapter/index.js';

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
   * All created block tool adapters, kept so their blockIndex can be updated
   * when blocks are inserted or removed.
   */
  #adapters: DOMBlockToolAdapter[] = [];

  /**
   * @param params - Plugin parameters
   * @param params.config - Editor's config
   * @param params.model - Model instance
   * @param params.eventBus - EventBus instance
   */
  constructor({ config, model, eventBus }: EditorjsAdapterPluginParams) {
    this.#iocContainer.bind<Required<CoreConfig>>(TOKENS.EditorConfig).toConstantValue(config as Required<CoreConfig>);
    this.#iocContainer.bind(EditorJSModel).toConstantValue(model);
    this.#iocContainer.bind(EventBus).toConstantValue(eventBus);
    this.#iocContainer
      .bind(DOMBlockToolAdapter)
      .toSelf()
      .inTransientScope();
  }

  /**
   * Creates a BlockToolAdapter for a block inserted at the given index.
   * Shifts registry entries and existing adapter indices before the new
   * adapter is created, keeping everything consistent.
   * @param blockIndex - position at which the new block is being inserted
   * @param toolName - name of the tool for this block
   */
  public createBlockToolAdapter(blockIndex: number, toolName: string): BlockToolAdapter {
    const registry = this.#iocContainer.get(InputsRegistry);

    registry.insertBlock(blockIndex);

    this.#adapters.forEach((adapter) => {
      if (adapter.getBlockIndex() >= blockIndex) {
        adapter.setBlockIndex(adapter.getBlockIndex() + 1);
      }
    });

    const adapter = this.#iocContainer.get(DOMBlockToolAdapter);

    adapter.setBlockIndex(blockIndex);
    adapter.setToolName(toolName);

    this.#adapters.splice(blockIndex, 0, adapter);

    return adapter;
  }

  /**
   * Destroys the BlockToolAdapter for the block at the given index.
   * Cleans up all inputs registered for the block and removes the adapter instance.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockIndex - index of the removed block
   */
  public destroyBlockToolAdapter(blockIndex: number): void {
    const registry = this.#iocContainer.get(InputsRegistry);

    registry.removeBlock(blockIndex);

    this.#adapters.splice(blockIndex, 1);

    this.#adapters.forEach((adapter) => {
      if (adapter.getBlockIndex() > blockIndex) {
        adapter.setBlockIndex(adapter.getBlockIndex() - 1);
      }
    });
  }
}

DOMAdapters satisfies EditorjsAdapterPluginConstructor;
