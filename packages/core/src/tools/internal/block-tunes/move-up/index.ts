import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { make } from '@editorjs/dom';
import { IconChevronUp } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that moves the current block one position up
 */
export class MoveUpTune implements BlockTune {
  public static readonly type = ToolType.Tune as const;
  public static readonly name = 'moveUp';

  #api: EditorAPI;
  #blockId: BlockId;

  constructor({ api, blockId }: BlockTuneConstructorOptions) {
    this.#api = api;
    this.#blockId = blockId;
  }

  public render(): HTMLElement {
    const button = make('button') as HTMLButtonElement;

    button.innerHTML = IconChevronUp;
    button.title = 'Move up';

    button.addEventListener('click', () => {
      const index = this.#api.blocks.getIndexById(String(this.#blockId));

      if (index > 0) {
        this.#api.blocks.move({ toIndex: index - 1,
          fromIndex: index });
      }
    });

    return button;
  }
}

MoveUpTune satisfies BlockTuneConstructor;
