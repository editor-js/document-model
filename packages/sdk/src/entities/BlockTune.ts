/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ToolConfig,
  BlockTune as BlockTuneV2
} from '@editorjs/editorjs';
import type { ToolType } from '@/entities/EntityType.js';
import type { BaseToolConstructor, BaseToolOptions } from '@/entities/BaseTool';
import type { BlockId } from '@editorjs/model';
import type { EditorAPI } from '@/api/EditorAPI.js';
import type { BlockTuneAdapter } from '@/entities/BlockTuneAdapter.js';

/**
 * Options available on **Block Tunes** (`static options` or `use()` overrides).
 * @template Config - Shape of the plugin-specific {@link BaseToolOptions.config} object.
 */
export interface BlockTuneOptions<Config extends ToolConfig = ToolConfig>
  extends BaseToolOptions<Config> {
  /** Any additional custom options exposed by the tune developer. */
  [key: string]: unknown;
}

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

  /**
   * Editor API for performing block operations (move, delete, etc.)
   */
  api: EditorAPI;

  /**
   * ID of the block this tune instance is bound to
   */
  blockId: BlockId;

  /**
   * Adapter providing data persistence and external update subscription for this tune instance
   */
  adapter: BlockTuneAdapter;
}

/**
 * Block Tune interface for version 3
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
> = Omit<BlockTuneV2, 'save' | 'render'> & {
  /**
   * Returns an HTML element for the tune (legacy render-based pattern)
   */
  render?(): HTMLElement;

  /**
   * Label shown in the block settings popover
   */
  title?: string;

  /**
   * SVG icon shown in the block settings popover
   */
  icon?: string;

  /**
   * Called when the tune is activated (clicked in the popover)
   */
  activate?(): void;

  /**
   * Returns true when the tune action is not applicable in the current state.
   * The corresponding popover item will be rendered as disabled.
   */
  isDisabled?(): boolean;
};

/**
 * Block Tune constructor class
 */
export interface BlockTuneConstructor extends BaseToolConstructor<ToolConfig, BlockTuneOptions> {
  new(options: BlockTuneConstructorOptions): BlockTune;

  /**
   * Property specifies that the class is a Tune
   */
  type: ToolType.Tune;
};
