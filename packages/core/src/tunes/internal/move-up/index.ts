import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconChevronUp } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that moves the current block one position up
 */
export class MoveUpTune implements BlockTune {
  public static readonly type = ToolType.Tune as const;
  public static readonly name = 'moveUp';

  public readonly title = 'Move up';
  public readonly icon = IconChevronUp;

  #api: EditorAPI;
  #blockId: BlockId;

  constructor({ api, blockId }: BlockTuneConstructorOptions) {
    this.#api = api;
    this.#blockId = blockId;
  }

  public isDisabled(): boolean {
    return this.#api.blocks.getIndexById(String(this.#blockId)) === 0;
  }

  public activate(): void {
    const index = this.#api.blocks.getIndexById(String(this.#blockId));

    if (index > 0) {
      this.#api.blocks.move({ toIndex: index - 1,
        fromIndex: index });
    }
  }
}

MoveUpTune satisfies BlockTuneConstructor;
