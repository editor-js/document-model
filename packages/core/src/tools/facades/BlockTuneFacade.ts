import { BaseToolFacade } from './BaseToolFacade.js';
import type { BlockAPI, BlockTune as IBlockTune, BlockTuneConstructable } from '@editorjs/editorjs';
import { ToolType } from './ToolType.js';
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
  protected declare constructable: BlockTuneConstructable;

  /**
   * Constructs new BlockTune instance from constructable
   * @param data - Tune data
   * @param block - Block API object
   */
  public create(data: any, block: BlockAPI): IBlockTune {
    return new this.constructable({
      api: this.api,
      config: this.settings,
      block,
      data,
    });
  }
}
