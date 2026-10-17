import { EventBus } from '@editorjs/model-types';

/**
 * Mock for PluginDataNode class
 */
export class PluginDataNode extends EventBus {
  /**
   * Mock getter
   */
  public get serialized(): object {
    return {};
  }

  /**
   * Mock getter
   */
  public get isEmpty(): boolean {
    return false;
  }

  /**
   * Mock method
   */
  public update(): void {
    return;
  }
}
