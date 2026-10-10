import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Payload of the BlockSettingsClosedUIEvent - empty for now
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockSettingsClosedUIEventPayload {}

/**
 * Class for event that is being fired after block settings have been closed
 */
export class BlockSettingsClosedUIEvent extends BlockSettingsBaseEvent<BlockSettingsClosedUIEventPayload> {
  /**
   * BlockSettingsClosedUIEvent constructor function
   * @param payload - BlockSettingsClosed event payload
   */
  constructor(payload: BlockSettingsClosedUIEventPayload) {
    super('closed', payload);
  }
}
