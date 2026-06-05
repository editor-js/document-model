import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconCross } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that deletes the current block
 */
export class DeleteBlockTune implements BlockTune {
  public static readonly type = ToolType.Tune as const;
  public static readonly name = 'deleteBlock';

  public readonly title = 'Delete';
  public readonly icon = IconCross;

  #api: EditorAPI;
  #blockId: BlockId;

  constructor({ api, blockId }: BlockTuneConstructorOptions) {
    this.#api = api;
    this.#blockId = blockId;
  }

  public activate(): void {
    const index = this.#api.blocks.getIndexById(String(this.#blockId));

    this.#api.blocks.delete({ block: index });
  }
}

DeleteBlockTune satisfies BlockTuneConstructor;
