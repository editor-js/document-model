import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  BlockSelectedCoreEvent,
  BlockSelectedUIEvent,
  CoreConfigValidated,
  EventBus
} from '@editorjs/sdk';
import { TOKENS } from '../tokens.js';
import ToolsManager from '../tools/ToolsManager.js';
import { EditorAPI } from '../api/index.js';

/**
 * BlockTunesManager listens for block selection events, instantiates tune instances
 * for the selected block, and emits a BlockSelectedCoreEvent so the UI can render them.
 */
@injectable()
export class BlockTunesManager {
  constructor(
    @inject(TOKENS.EditorConfig) _config: CoreConfigValidated,
    eventBus: EventBus,
    toolsManager: ToolsManager,
    api: EditorAPI,
  ) {
    eventBus.addEventListener('ui:blocks:block-selected', (event: BlockSelectedUIEvent) => {
      const { index } = event.detail;
      const blockId = api.blocks.getIdByIndex(index);

      if (blockId === undefined) {
        return;
      }

      const availableBlockTunes = new Map(
        Array.from(toolsManager.blockTunes.entries()).map(([name, facade]) => [
          name,
          facade.create({}, blockId, api),
        ])
      );

      eventBus.dispatchEvent(new BlockSelectedCoreEvent({
        index,
        blockId,
        availableBlockTunes,
      }));
    });
  }
}
