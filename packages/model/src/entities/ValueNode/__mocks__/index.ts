import { EventBus } from '../../../utils/EventBus/EventBus.js';

/**
 * Mock for ValueNode class
 */
export class ValueNode extends EventBus {
  /**
   * Mock method
   */
  public get serialized(): object {
    return {};
  }

  /**
   * Mock method
   */
  public update(): void {
    return;
  }
}
