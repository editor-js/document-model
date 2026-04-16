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

/**
 * IoC keys and related ids for editor plugins (`core.use(MyPlugin)`).
 */
export enum PluginType {
  /**
   * Default plugin type
   */
  Plugin = 'Plugin'
}

export type EntityType = ToolType | UiComponentType | PluginType;
