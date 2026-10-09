import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Payload of the BlockSettingsRenderedUIEvent
 * Contains the block settings HTML element
 */
export interface BlockSettingsRenderedUIEventPayload {
  /**
   * Block settings HTML element
   */
  readonly blockSettings: HTMLElement;
}

/**
 * Class for event that is being fired after the block settings menu is rendered
 */
export class BlockSettingsRenderedUIEvent extends BlockSettingsBaseEvent<BlockSettingsRenderedUIEventPayload> {
  /**
   * BlockSettingsRenderedUIEvent constructor function
   * @param payload - BlockSettingsRendered event payload
   */
  constructor(payload: BlockSettingsRenderedUIEventPayload) {
    super('rendered', payload);
  }
}
