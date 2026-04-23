import { UIEventBase } from './UIEventBase.js';

/**
 * Name of the copy UI event (dispatched as `ui:copy`)
 */
export const CopyUIEventName = 'copy';

/**
 * Payload @todo update doc
 */
export interface CopyUIEventPayload {
  /**
   * @todo update doc
   */
  nativeEvent: ClipboardEvent;
}

/**
 * Delegated copy event from the editor @todo update doc
 */
export class CopyUIEvent extends UIEventBase<CopyUIEventPayload> {
  /**
   * @param payload - carries the original DOM `ClipboardEvent` as `nativeEvent` for providing rich clipboard data
   */
  constructor(payload: CopyUIEventPayload) {
    super(CopyUIEventName, payload);
  }
}
