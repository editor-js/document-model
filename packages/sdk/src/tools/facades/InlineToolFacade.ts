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
   * Returns the singleton InlineTool instance, creating it on the first call.
   * Callers share it and must not destroy it themselves; see {@link destroy}
   */
  public create(): InlineTool {
    if (this.#instance === undefined) {
      /**
       * @todo fix types
       */
      this.#instance = new this.constructable(
        {
          api: this.api,
        //   config: this.config,
        }
      );
    }

    return this.#instance;
  }

  /**
   * Destroys the shared instance, once.
   *
   * The facade is the instance's only owner: every consumer gets the same object from {@link create},
   * so none of them destroys it. The editor calls this on teardown. The instance is dropped before its
   * `destroy()` runs, so a throwing hook can't leave it alive or make a later call run the hook again
   */
  public destroy(): void {
    const instance = this.#instance;

    this.#instance = undefined;

    instance?.destroy?.();
  }
}
