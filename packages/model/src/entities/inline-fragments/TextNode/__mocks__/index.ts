import { EventBus } from '../../../../EventBus/EventBus.js';

/**
 * Mock for TextNode class
 */
export class TextNode extends EventBus {
  /**
   * Mock getter
   */
  public get serialized(): object {
    return {};
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
   * Mock method
   */
  public getFragments(): void {
    return;
  }
}
