import { UIEventBase } from './UIEventBase.js';

/**
 * Name of the keydown UI event (dispatched as `ui:key-down`)
 */
export const KeydownUIEventName = 'key-down';

/**
 * Payload for delegated keydown from the blocks surface
 */
export interface KeydownUIEventPayload {
  /**
   * Original keydown event from the DOM (same phase as listener — typically bubbling)
   */
  nativeEvent: KeyboardEvent;
}

/**
 * Delegated keyboard event from the editor blocks holder
 */
export class KeydownUIEvent extends UIEventBase<KeydownUIEventPayload> {
  /**
   * @param payload - keydown payload
   */
  constructor(payload: KeydownUIEventPayload) {
    super(KeydownUIEventName, payload);
  }
}
