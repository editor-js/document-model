import { UIEventBase } from '../../components/EventBus/index.js';

/**
 * Payload of the InlineToolbarRenderedUIEvent
 * Contains InlineToolbar HTML element
 */
export interface InlineToolbarRenderedUIEventPayload {
  /**
   * Toolbox HTML element
   */
  readonly toolbar: HTMLElement;
}

/**
 * Class for event that is being fired after the inline toolbar is rendered
 */
export class InlineToolbarRenderedUIEvent extends UIEventBase<InlineToolbarRenderedUIEventPayload> {
  /**
   * ToolboxRenderedUIEvent constructor function
   * @param payload - ToolboxRendered event payload
   */
  constructor(payload: InlineToolbarRenderedUIEventPayload) {
    super('inline-toolbar:rendered', payload);
  }
}
