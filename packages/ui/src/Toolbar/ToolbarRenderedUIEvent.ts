import { UIEventBase } from '@editorjs/sdk';

/**
 * Payload of the ToolbarRenderedUIEvent
 * Contains Toolbar HTML element
 */
export interface ToolbarRenderedUIEventPayload {
  /**
   * Toolbox HTML element
   */
  readonly toolbar: HTMLElement;
}

/**
 * Class for events that is being fired after the toolbar is rendered
 */
export class ToolbarRenderedUIEvent extends UIEventBase<ToolbarRenderedUIEventPayload> {
  /**
   * ToolboxRenderedUIEvent constructor function
   * @param payload - ToolboxRendered events payload
   */
  constructor(payload: ToolbarRenderedUIEventPayload) {
    super('toolbar:rendered', payload);
  }
}
