import { BaseToolFacade } from './BaseToolFacade.js';
import type { BlockTuneConstructor, BlockTune as IBlockTune, BlockTuneData } from '../../entities';
import { ToolType } from '../../entities';
import type { BlockId } from '@editorjs/model';
import type { EditorAPI } from '../../api/EditorAPI.js';
import type { BlockTuneAdapter } from '../../entities/BlockTuneAdapter.js';

/**
 * Facade for BlockTune tools
 */
export class BlockTuneFacade extends BaseToolFacade<ToolType.Tune, IBlockTune> {
  /**
   * Tool type — Tune
   */
  public type: ToolType.Tune = ToolType.Tune;

  /**
   * Tool's constructable blueprint
   */
  protected declare constructable: BlockTuneConstructor;

  /**
   * Constructs a new BlockTune instance for a specific block
   * @param data - Tune's persistent data
   * @param blockId - ID of the block this tune is bound to
   * @param api - Editor API for performing block operations
   * @param adapter - Adapter providing data persistence for this tune
   */
  public create(data: BlockTuneData, blockId: BlockId, api: EditorAPI, adapter: BlockTuneAdapter): IBlockTune {
    return new this.constructable({
      config: this.config,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
      api,
      blockId,
      adapter,
    });
  }
}
