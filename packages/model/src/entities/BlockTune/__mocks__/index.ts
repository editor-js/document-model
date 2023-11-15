import { createBlockTuneName } from '../types/index.js';

/**
 * Mock for BlockTune class
 */
export class BlockTune {
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