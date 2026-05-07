import { EventBus } from '../../../EventBus/EventBus.js';
import { create } from '../../../utils/index.js';
import type { DataKey } from '../types/index.js';
import type { BlockId } from '../types/BlockId.js';
import { createBlockId } from '../types/BlockId.js';

export const createDataKey = create<DataKey>();

let _instanceCounter = 0;

/**
 * Mock for BlockNode class
 */
export class BlockNode extends EventBus {
  /**
   * Unique id per mock instance
   */
  readonly #id: BlockId;

  /**
   * Mock constructor — assigns a unique id to each instance
   */
  constructor() {
    super();
    this.#id = createBlockId(`mock-block-${++_instanceCounter}`);
  }

  /**
   * Mock getter
   */
  public get id(): BlockId {
    return this.#id;
  }

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
  public getDataNode(): void {
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
