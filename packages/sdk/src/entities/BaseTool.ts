import type { ToolConfig } from '@editorjs/editorjs';

/**
 * Common interface for Tools static properties
 */
export interface BaseToolConstructor<Config extends ToolConfig = ToolConfig> {
  /**
   * Tool's prepare method. Can be async
   * @param data - Object with toolName and config properties
   * @param data.toolName - Tool's own name
   * @param data.config - Tool's configuration
   */
  // eslint-disable-next-line
  prepare?(data: { toolName: string, config: Config }): void | Promise<void>;

  /**
   * Tool's reset method to clean up anything set by prepare. Can be async
   */
  reset?(): void | Promise<void>;
}
