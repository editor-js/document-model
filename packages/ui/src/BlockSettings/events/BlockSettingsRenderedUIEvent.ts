import { BlockSettingsBaseEvent } from './BlockSettingsBaseEvent.js';

/**
 * Payload of the BlockSettingsRenderedUIEvent
 * Carries the elements the plugin owns, for a host to mount
 */
export interface BlockSettingsRenderedUIEventPayload {
  /**
   * The control that opens the menu.
   *
   * Announced separately from the menu because a host has to place it among its own
   * controls -- `ToolbarUI` puts it in its actions container, where it takes part in the
   * toolbar's roving tabindex and so has to be a child of that container in its own right
   */
  readonly button: HTMLElement;

  /**
   * The element the menu renders into
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
