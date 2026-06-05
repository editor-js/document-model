import type { BlockTune, BlockTuneConstructor, BlockTuneConstructorOptions } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { make } from '@editorjs/dom';
import { IconCross } from '@codexteam/icons';
import type { EditorAPI } from '@editorjs/sdk';
import type { BlockId } from '@editorjs/model';

/**
 * Internal tune that deletes the current block
 */
export class DeleteBlockTune implements BlockTune {
  public static readonly type = ToolType.Tune as const;
  public static readonly name = 'deleteBlock';

  #api: EditorAPI;
  #blockId: BlockId;

  constructor({ api, blockId }: BlockTuneConstructorOptions) {
    this.#api = api;
    this.#blockId = blockId;
  }

  public render(): HTMLElement {
    const button = make('button') as HTMLButtonElement;

    button.innerHTML = IconCross;
    button.title = 'Delete';

    button.addEventListener('click', () => {
      const index = this.#api.blocks.getIndexById(String(this.#blockId));

      this.#api.blocks.delete({ block: index });
    });

    return button;
  }
}

DeleteBlockTune satisfies BlockTuneConstructor;
