import type {
  BlockToolAdapter,
  EditorJSAdapterPlugin, EditorjsAdapterPluginConstructor,
  EditorjsAdapterPluginParams
} from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';
import { DOMBlockToolAdapter } from './BlockToolAdapter/index.js';
import { InputsRegistry } from './InputsRegistry/index.js';
import { BlockRemovedEvent, EditorJSModel, EventType } from '@editorjs/model';
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

    const registry = this.#iocContainer.get(InputsRegistry);

    model.addEventListener(EventType.Changed, (event) => {
      if (event instanceof BlockRemovedEvent) {
        const removedBlockIndex = event.detail.index.blockIndex;

        if (removedBlockIndex === undefined) {
          return;
        }

        registry.removeBlock(removedBlockIndex);

        this.#adapters.splice(removedBlockIndex, 1);

        this.#adapters.forEach((adapter) => {
          if (adapter.getBlockIndex() > removedBlockIndex) {
            adapter.setBlockIndex(adapter.getBlockIndex() - 1);
          }
        });
      }
    });
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
}

DOMAdapters satisfies EditorjsAdapterPluginConstructor;
