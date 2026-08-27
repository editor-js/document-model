import { UIEventBase } from './UIEventBase.js';

/**
 * Name of the copy UI event (dispatched as `ui:copy`)
 */
export const CopyUIEventName = 'copy';

/**
 * Payload of CopyUIEvent
 * Contains a native clipboard event
 */
export interface CopyUIEventPayload {
  /**
   * Native ClipboardEvent
   * UI does not call .preventDefault() for this event
   */
  nativeEvent: ClipboardEvent;
}

/**
 * Delegated copy event from the editor block holder
 */
export class CopyUIEvent extends UIEventBase<CopyUIEventPayload> {
  /**
   * @param payload - carries the original DOM `ClipboardEvent` as `nativeEvent` for providing rich clipboard data
   */
  constructor(payload: CopyUIEventPayload) {
    super(CopyUIEventName, payload);
  }
}
