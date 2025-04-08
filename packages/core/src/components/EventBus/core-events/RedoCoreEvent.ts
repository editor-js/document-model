import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Event is fired when redo action should be performed. E.g. could be fired from UI modules
 */
export class RedoCoreEvent extends CoreEventBase<undefined> {
  /**
   * RedoCoreEvent constructor function
   */
  constructor() {
    super(CoreEventType.Redo, undefined);
  }
}
