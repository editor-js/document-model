import { UIEventBase } from './UIEventBase.js';

/**
 * Name of the event
 */
export const BeforeInputUIEventName = 'before-input';

/**
 * Payload of the BeforeInputUIEvent
 * Contains InlineToolbar HTML element
 */
export interface BeforeInputUIEventPayload {
  /**
   * A string with the inserted characters.
   * This may be an empty string if the change doesn't insert text
   * (for example, when deleting characters).
   */
  data: string;

  /**
   * Same as 'beforeinput' event's inputType
   */
  inputType: string;

  /**
   * Same as 'beforeinput' event's isComposing
   */
  isComposing: boolean;

  /**
   * Objects that will be affected by a change to the DOM if the input event is not canceled.
   */
  targetRanges: StaticRange[];

  /**
   * Whether the selection is across multiple inputs
   */
  isCrossInputSelection: boolean;
}

/**
 * Class for event that is being fired after the inline toolbar is rendered
 */
export class BeforeInputUIEvent extends UIEventBase<BeforeInputUIEventPayload> {
  /**
   * ToolboxRenderedUIEvent constructor function
   * @param payload - ToolboxRendered event payload
   */
  constructor(payload: BeforeInputUIEventPayload) {
    super(BeforeInputUIEventName, payload);
  }
}
