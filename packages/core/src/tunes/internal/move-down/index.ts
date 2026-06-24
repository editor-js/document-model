import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconChevronDown } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that moves the current block one position down
 */
export class MoveDownTune implements BlockTune {
  public static readonly type = ToolType.Tune;
  public static readonly name = 'moveDown';

  public readonly title = 'Move down';
  public readonly icon = IconChevronDown;

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
   * Whether the block is already last, so it cannot move down further
   */
  public isDisabled(): boolean {
    const index = this.#api.blocks.getIndexById(String(this.#blockId));

    return index === this.#api.blocks.getBlocksCount() - 1;
  }

  /**
   * Moves the block this tune is attached to one position down
   */
  public activate(): void {
    const index = this.#api.blocks.getIndexById(String(this.#blockId));
    const count = this.#api.blocks.getBlocksCount();

    if (index < count - 1) {
      this.#api.blocks.move({ toIndex: index + 1,
        fromIndex: index });
    }
  }
}

MoveDownTune satisfies BlockTuneConstructor;
