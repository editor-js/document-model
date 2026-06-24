import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconChevronUp } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that moves the current block one position up
 */
export class MoveUpTune implements BlockTune {
  public static readonly type = ToolType.Tune;
  public static readonly name = 'moveUp';

  public readonly title = 'Move up';
  public readonly icon = IconChevronUp;

  #api: EditorAPI;
  #blockId: BlockId;

  /**
   * @param options - tune constructor options
   * @param options.api - editor API
   * @param options.blockId - id of the block this tune is attached to
   */
  constructor({ api, blockId }: BlockTuneConstructorOptions) {
    this.#api = api;
    this.#blockId = blockId;
  }

  /**
   * Whether the block is already first, so it cannot move up further
   */
  public isDisabled(): boolean {
    return this.#api.blocks.getIndexById(String(this.#blockId)) === 0;
  }

  /**
   * Moves the block this tune is attached to one position up
   */
  public activate(): void {
    const index = this.#api.blocks.getIndexById(String(this.#blockId));

    if (index > 0) {
      this.#api.blocks.move({ toIndex: index - 1,
        fromIndex: index });
    }
  }
}

MoveUpTune satisfies BlockTuneConstructor;
