import { BaseToolFacade, InternalInlineToolSettings } from './BaseToolFacade.js';
import type { InlineTool as IInlineTool, InlineToolConstructor as InlineToolConstructable } from '@editorjs/sdk';
import { ToolType } from './ToolType.js';

/**
 * InlineTool object to work with Inline Tools constructables
 */
export class InlineToolFacade extends BaseToolFacade<ToolType.Inline, IInlineTool> {
  /**
   * Tool type for InlineToolFacade tools — Inline
   */
  public type: ToolType.Inline = ToolType.Inline;

  /**
   * Tool's constructable blueprint
   */
  protected declare constructable: InlineToolConstructable;

  /**
   * Returns title for Inline Tool if specified by user
   */
  public get title(): string | undefined {
    return this.constructable[InternalInlineToolSettings.Title];
  }

  /**
   * Constructs new InlineTool instance from constructable
   */
  public create(): IInlineTool {
    /**
     * @todo fix types
     */
    return new this.constructable({
      api: this.api,
      config: this.settings,
    }) as unknown as IInlineTool;
  }
}
