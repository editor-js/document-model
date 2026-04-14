/**
 * List of reserved UI component names
 */
export enum UiComponentType {
  /**
   * Main wrapper UI element
   */
  Shell = 'shell',

  /**
   * Blocks wrapper
   */
  Blocks = 'blocks',

  /**
   * Inline toolbar wrapper
   */
  InlineToolbar = 'inline-toolbar',

  /**
   * Toolbox wrapper
   */
  Toolbox = 'toolbox'
}

/**
 * List of reserved Tool types
 */
export enum ToolType {
  /**
   * Block Tool
   */
  Block = 'block',

  /**
   * Inline Tool
   */
  Inline = 'inline',

  /**
   * Block Tune
   */
  Tune = 'tune'
}

export type EntityType = ToolType | UiComponentType;
