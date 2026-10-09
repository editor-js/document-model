import type { BlockId } from '@editorjs/sdk';
import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Reports which block the menu that just opened was built for
 */
export interface BlockSettingsOpenedUIEventPayload {
  /**
   * Id of the block the opened menu was built for
   */
  readonly blockId: BlockId;
}

/**
 * Class for event that is being fired after block settings have been opened
 */
export class BlockSettingsOpenedUIEvent extends BlockSettingsBaseEvent<BlockSettingsOpenedUIEventPayload> {
  /**
   * BlockSettingsOpenedUIEvent constructor function
   * @param payload - BlockSettingsOpened event payload
   */
  constructor(payload: BlockSettingsOpenedUIEventPayload) {
    super('opened', payload);
  }
}
