import { UIEventBase } from '@editorjs/sdk';

/**
 * Payload of the ToolboxRenderedUIEvent
 * Contains Toolbox HTML element
 */
export interface ToolboxRenderedUIEventPayload {
  /**
   * Toolbox HTML element
   */
  readonly toolbox: HTMLElement;
}

/**
 * Class for event that is being fired after the toolbox is rendered
 */
export class ToolboxRenderedUIEvent extends UIEventBase<ToolboxRenderedUIEventPayload> {
  /**
   * ToolboxRenderedUIEvent constructor function
   * @param payload - ToolboxRendered event payload
   */
  constructor(payload: ToolboxRenderedUIEventPayload) {
    super('toolbox:rendered', payload);
  }
}
