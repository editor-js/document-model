import { createBlockTuneName } from '../types/index.js';
import { EventBus } from '../../../EventBus/EventBus.js';

/**
 * Mock for BlockTune class
 */
export class BlockTune extends EventBus {
  /**
   * Mock getter
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

export { createBlockTuneName };
