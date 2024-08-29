import { type BlockToolBuilder } from './BlockToolBuilder.js';
import { type InlineToolBuilder } from './InlineToolBuilder.js';
import { type BlockTuneBuilder } from './BlockTuneBuilder.js';

export type ToolClass = BlockToolBuilder | InlineToolBuilder | BlockTuneBuilder;

/**
 * Class to store Editor Tools
 */
export class ToolsCollection<V extends ToolClass = ToolClass> extends Map<string, V> {
  /**
   * Returns Block Tools collection
   */
  public get blockTools(): ToolsCollection<BlockToolBuilder> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isBlock()) as [string, BlockToolBuilder][];

    return new ToolsCollection<BlockToolBuilder>(tools);
  }

  /**
   * Returns Inline Tools collection
   */
  public get inlineTools(): ToolsCollection<InlineToolBuilder> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isInline()) as [string, InlineToolBuilder][];

    return new ToolsCollection<InlineToolBuilder>(tools);
  }

  /**
   * Returns Block Tunes collection
   */
  public get blockTunes(): ToolsCollection<BlockTuneBuilder> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isTune()) as [string, BlockTuneBuilder][];

    return new ToolsCollection<BlockTuneBuilder>(tools);
  }

  /**
   * Returns internal Tools collection
   */
  public get internalTools(): ToolsCollection<V> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isInternal);

    return new ToolsCollection<V>(tools);
  }

  /**
   * Returns Tools collection provided by user
   */
  public get externalTools(): ToolsCollection<V> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => !tool.isInternal);

    return new ToolsCollection<V>(tools);
  }
}
