import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Payload of the BlockSettingsOpenedUIEvent - empty for now
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockSettingsOpenedUIEventPayload {}

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
