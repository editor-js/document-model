import type { InlineTool } from '@editorjs/sdk';
import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';
import type { Index, InlineToolName } from '@editorjs/model';

/**
 * Payload of SelectionChangedCoreEvent custom event
 * Contains updated caret index and available inline tools
 */
export interface SelectionChangedCoreEventPayload {
  /**
   * Updated caret index
   */
  readonly index: Index | null;

  /**
   * Inline tools available for the current selection
   */
  readonly availableInlineTools: Map<InlineToolName, InlineTool>;
}

/**
 * Class for event that is being fired after the selection is changed
 */
export class SelectionChangedCoreEvent extends CoreEventBase<SelectionChangedCoreEventPayload> {
  /**
   * SelectionChangedCoreEvent constructor function
   * @param payload - SelectionChangedCoreEvent event payload with updated caret index
   */
  constructor(payload: SelectionChangedCoreEventPayload) {
    super(CoreEventType.SelectionChanged, payload);
  }
}
