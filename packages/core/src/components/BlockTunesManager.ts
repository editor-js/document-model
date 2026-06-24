import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  BlockSelectedCoreEvent,
  BlockSelectedUIEvent,
  EditorJSAdapterPlugin,
  EventBus
} from '@editorjs/sdk';
import ToolsManager from '../tools/ToolsManager.js';
import { EditorAPI } from '../api/index.js';
import { TOKENS } from '../tokens.js';

/**
 * BlockTunesManager listens for block selection events, instantiates tune instances
 * for the selected block, and emits a BlockSelectedCoreEvent so the UI can render them.
 */
@injectable()
export class BlockTunesManager {
  constructor(
    eventBus: EventBus,
    toolsManager: ToolsManager,
    api: EditorAPI,
    @inject(TOKENS.Adapter) adapter: EditorJSAdapterPlugin
  ) {
    eventBus.addEventListener('ui:blocks:block-selected', (event: BlockSelectedUIEvent) => {
      const { index } = event.detail;
      const blockId = api.blocks.getIdByIndex(index);

      if (blockId === undefined) {
        return;
      }

      const availableBlockTunes = new Map(
        Array.from(toolsManager.blockTunes.entries()).map(([name, facade]) => {
          const tuneAdapter = adapter.getBlockTuneAdapter(blockId, name)
            ?? adapter.createBlockTuneAdapter(blockId, name);

          return [
            name,
            facade.create({}, blockId, api, tuneAdapter),
          ];
        })
      );

      eventBus.dispatchEvent(new BlockSelectedCoreEvent({
        index,
        blockId,
        availableBlockTunes,
      }));
    });
  }
}
