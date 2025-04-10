import type { BlockTool as BlockToolVersion2, BlockToolConstructable as BlockToolConstructableV2, ToolConfig } from '@editorjs/editorjs';
import type { BlockToolConstructorOptions as BlockToolConstructorOptionsVersion2 } from '@editorjs/editorjs';
import type { ValueSerialized } from '@editorjs/model';
import type { BlockToolAdapter } from './BlockToolAdapter.js';

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
export interface BlockToolConstructorOptions<
  /**
   * Data structure describing the tool's input/output data
   */
  Data extends BlockToolData = BlockToolData,

  /**
   * User-end configuration for the tool
   */
  Config extends ToolConfig = ToolConfig
> extends BlockToolConstructorOptionsVersion2 {
  /**
   * Block tool adapter will be passed to the tool to connect data with the DOM
   */
  adapter: BlockToolAdapter;

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
 * Block Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
export type BlockTool<
  /**
   * Data structure describing the tool's input/output data
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  Data extends BlockToolData = any,

  /**
   * User-end configuration for the tool
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  Config extends ToolConfig = any
> = Omit<BlockToolVersion2, 'save'>;

/**
 * Block Tool constructor class
 */
export type BlockToolConstructor = BlockToolConstructableV2 & (new (options: BlockToolConstructorOptions) => BlockTool);

/**
 * Data structure describing the tool's input/output data
 *
 * any is used as a placeholder to allow using BlockToolData without generic
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockToolData<T extends Record<string, ValueSerialized> = any> = T;
