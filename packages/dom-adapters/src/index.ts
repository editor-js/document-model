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
import type { BlockId } from '@editorjs/model';
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

    return adapter;
  }

  /**
   * Destroys the BlockToolAdapter for the given block.
   * Cleans up all inputs registered for the block and removes the adapter instance.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockId - unique id of the removed block
   */
  public destroyBlockToolAdapter(blockId: BlockId): void {
    const registry = this.#iocContainer.get(InputsRegistry);

    registry.removeBlock(blockId);
  }
}

DOMAdapters satisfies EditorjsAdapterPluginConstructor;
