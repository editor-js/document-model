/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ToolConfig,
  BlockTune as BlockTuneV2
} from '@editorjs/editorjs';
import type { ToolType } from '@/entities/EntityType.js';
import type { BaseToolConstructor } from '@/entities/BaseTool';

/**
 * BlockTune data type
 * @todo move to data description section when migrated from V2
 */
export type BlockTuneData = any;

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
export interface BlockTuneConstructorOptions<
  /**
   * Data structure describing the tool's input/output data
   */
  Data extends BlockTuneData = BlockTuneData,
  /**
   * User-end configuration for the tool
   */
  Config extends ToolConfig = ToolConfig
> {
  /**
   * Tool's input/output data
   */
  data: Data;

  /**
   * Config could be passed by tools user through the Editor config
   */
  config: Config;
}

/**
 * Block Tune interface for version 3
 * @todo describe the interface when the adapter implementation is done
 */
export type BlockTune<
  /**
   * Data structure describing the tool's input/output data
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Data extends BlockTuneData = any,
  /**
   * User-end configuration for the tool
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Config extends ToolConfig = any
> = Omit<BlockTuneV2, 'save'>;

/**
 * Block Tool constructor class
 */
export interface BlockTuneConstructor extends BaseToolConstructor {
  new(options: BlockTuneConstructorOptions): BlockTune;

  /**
   * Property specifies that the class is a Tune
   */
  type: ToolType.Tune;
};
