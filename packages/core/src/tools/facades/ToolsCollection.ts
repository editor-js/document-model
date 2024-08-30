import { type BlockToolFacade } from './BlockToolFacade.js';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';

export type ToolFacadeClass = BlockToolFacade | InlineToolFacade | BlockTuneFacade;

/**
 * Class to store Editor Tools
 */
export class ToolsCollection<V extends ToolFacadeClass = ToolFacadeClass> extends Map<string, V> {
  /**
   * Returns Block Tools collection
   */
  public get blockTools(): ToolsCollection<BlockToolFacade> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isBlock()) as [string, BlockToolFacade][];

    return new ToolsCollection<BlockToolFacade>(tools);
  }

  /**
   * Returns Inline Tools collection
   */
  public get inlineTools(): ToolsCollection<InlineToolFacade> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isInline()) as [string, InlineToolFacade][];

    return new ToolsCollection<InlineToolFacade>(tools);
  }

  /**
   * Returns Block Tunes collection
   */
  public get blockTunes(): ToolsCollection<BlockTuneFacade> {
    const tools = Array
      .from(this.entries())
      .filter(([, tool]) => tool.isTune()) as [string, BlockTuneFacade][];

    return new ToolsCollection<BlockTuneFacade>(tools);
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
