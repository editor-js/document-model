import type { BlockTool as BlockToolVersion2, ToolConfig } from '@editorjs/editorjs';
import type { BlockToolConstructorOptions as BlockToolConstructorOptionsVersion2 } from '@editorjs/editorjs';
import type { ValueSerialized } from '@editorjs/model';
import { BlockToolAdapter } from './BlockToolAdapter';

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
export interface BlockToolConstructorOptions<
  Data extends BlockToolData = BlockToolData,
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
  Data extends BlockToolData = any,
  Config extends ToolConfig = any
> = Omit<BlockToolVersion2, 'save'>;

/**
 * Block Tool constructor class
 */
export type BlockToolConstructor = new (options: BlockToolConstructorOptions) => BlockTool;

/**
 * Data structure describing the tool's input/output data
 */
export type BlockToolData<T extends Record<string, ValueSerialized> = any> = T;
