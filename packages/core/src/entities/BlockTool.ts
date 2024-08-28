import type { BlockToolAdapter } from '@editorjs/dom-adapters';
import type { BlockTool as BlockToolVersion2 } from '@editorjs/editorjs';
import type { BlockToolConstructorOptions as BlockToolConstructorOptionsVersion2 } from '@editorjs/editorjs';

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
export interface BlockToolConstructorOptions extends BlockToolConstructorOptionsVersion2 {
  /**
   * Block tool adapter will be passed to the tool to connect data with the DOM
   */
  blockToolAdapter: BlockToolAdapter;
}

/**
 * Block Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockTool extends Omit<BlockToolVersion2, 'save'> {
}

/**
 * Block Tool constructor class
 */
export type BlockToolConstructor = new (options: BlockToolConstructorOptions) => BlockTool;
