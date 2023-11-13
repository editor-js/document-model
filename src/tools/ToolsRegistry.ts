/* eslint-disable jsdoc/require-jsdoc */
import type { BlockToolName, InlineToolName } from '../entities';
import type { BlockToolConstructable, InlineToolConstructable } from './types';

/**
 * ToolsRegistry map stores Editor.js Tools by their names
 */
export class ToolsRegistry extends Map {
  /**
   * Returns tool by its name
   *
   * @param name - Block or Inline tool name
   */
  public get(inlineToolName: InlineToolName): InlineToolConstructable;
  public get(blockToolName: BlockToolName): BlockToolConstructable;
  public get(name: BlockToolName | InlineToolName): BlockToolConstructable | InlineToolConstructable {
    return super.get(name);
  }
}
