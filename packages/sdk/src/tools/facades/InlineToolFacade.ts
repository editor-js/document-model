import { BaseToolFacade, InternalInlineToolSettings } from './BaseToolFacade.js';
import type { InlineTool, InlineToolConstructor } from '../../entities';
import { ToolType } from '../../entities';

/**
 * InlineTool object to work with Inline Tools constructables
 */
export class InlineToolFacade extends BaseToolFacade<ToolType.Inline, InlineTool> {
  /**
   * Tool type for InlineToolFacade tools — Inline
   */
  public type: ToolType.Inline = ToolType.Inline;

  /**
   * Tool's constructable blueprint
   */
  protected declare constructable: InlineToolConstructor;

  /**
   * Cached instance of the inline tool
   * Inline tools are singletons — the same instance is reused across all calls to create()
   */
  #instance: InlineTool | undefined;

  /**
   * Returns title for Inline Tool if specified by user
   */
  public get title(): string | undefined {
    return this.constructable[InternalInlineToolSettings.Title];
  }

  /**
   * Returns the singleton InlineTool instance, creating it on the first call
   */
  public create(): InlineTool {
    if (this.#instance === undefined) {
      /**
       * @todo fix types
       */
      this.#instance = new this.constructable(
        // {
        //   api: this.api,
        //   config: this.config,
        // }
      );
    }

    return this.#instance;
  }
}
