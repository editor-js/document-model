import { EventBus } from '../../../EventBus/EventBus.js';
import { create } from '../../../utils/index.js';
import type { DataKey } from '../types/index';

export const createDataKey = create<DataKey>();

/**
 * Mock for BlockNode class
 */
export class BlockNode extends EventBus {
  /**
   * Mock method
   */
  public createDataNode(): void {
    return;
  }
  /**
   * Mock method
   */
  public removeDataNode(): void {
    return;
  }

  /**
   * Mock method
   */
  public updateValue(): void {
    return;
  }

  /**
   * Mock method
   */
  public updateTuneData(): void {
    return;
  }

  /**
   * Mock method
   */
  public getText(): string {
    return 'mocked text';
  }

  /**
   * Mock method
   */
  public insertText(): void {
    return;
  }

  /**
   * Mock method
   */
  public removeText(): void {
    return;
  }

  /**
   * Mock method
   */
  public format(): void {
    return;
  }

  /**
   * Mock method
   */
  public unformat(): void {
    return;
  }

  /**
   * Mock getter
   */
  public get serialized(): void {
    return;
  }

  /**
   * Mock method
   */
  public getFragments(): void {
    return;
  }
}
