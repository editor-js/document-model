import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Event is fired when undo action should be performed. E.g. could be fired from UI modules
 */
export class UndoCoreEvent extends CoreEventBase<undefined> {
  /**
   * UndoCoreEvent constructor function
   */
  constructor() {
    super(CoreEventType.Undo, undefined);
  }
}
