import { BaseToolFacade } from './BaseToolFacade.js';
import type { BlockAPI } from '@editorjs/editorjs';
import type { BlockTuneConstructor, BlockTune as IBlockTune, BlockTuneData } from '../../entities';
import { ToolType } from '../../entities';
// import type { BlockTuneData } from '@editorjs/editorjs';

/**
 * Stub class for BlockTunes
 * @todo Implement
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
   * Constructs new BlockTune instance from constructable
   * @param data - Tunes data
   * @param _block - Block API object
   */
  public create(data: BlockTuneData, _block: BlockAPI): IBlockTune {
    return new this.constructable({
      // api: this.api,
      config: this.config,
      // block,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });
  }
}
