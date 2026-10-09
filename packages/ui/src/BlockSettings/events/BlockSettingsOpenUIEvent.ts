import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Names the block whose settings should be shown
 */
export interface BlockSettingsOpenUIEventPayload {
  /**
   * Position of the block to show settings for.
   *
   * An index rather than an id because the dispatcher is the toolbar, which follows block
   * selection by position. `BlockSettingsUI` resolves it to an id once, when the menu opens,
   * and the providers' items work from that id afterwards
   */
  readonly index: number;
}

/**
 * Class for event that is being fired when block settings should be opened
 */
export class BlockSettingsOpenUIEvent extends BlockSettingsBaseEvent<BlockSettingsOpenUIEventPayload> {
  /**
   * BlockSettingsOpenUIEvent constructor function
   * @param payload - BlockSettingsOpen event payload
   */
  constructor(payload: BlockSettingsOpenUIEventPayload) {
    super('open', payload);
  }
}
