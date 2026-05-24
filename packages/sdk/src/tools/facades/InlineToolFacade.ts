import { BaseToolFacade } from './BaseToolFacade.js';
import type { InlineToolOptions } from './BaseToolFacade.js';
import { InlineToolOptionKey } from '../../entities/InlineTool.js';
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
   * Tool's constructable blueprint — narrowed to InlineToolConstructor
   */
  protected declare constructable: InlineToolConstructor;

  /**
   * Narrowed to InlineToolOptions so inline-specific properties are fully typed
   */
  protected declare useToolOptions: InlineToolOptions;

  /**
   * Cached instance of the inline tool
   * Inline tools are singletons — the same instance is reused across all calls to create()
   */
  #instance: InlineTool | undefined;

  /**
   * Returns title for Inline Tool if specified via `options.title`.
   * Reads from merged options (static `constructable.options` merged with `use(Tool, options)` overrides).
   */
  public get title(): string | undefined {
    return this.options[InlineToolOptionKey.Title];
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
