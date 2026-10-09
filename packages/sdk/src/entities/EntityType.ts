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
  Toolbox = 'toolbox',

  /**
   * Toolbar area wrapper. Includes Toolbox and Block Settings
   */
  Toolbar = 'toolbar',

  /**
   * Per-block settings menu wrapper
   */
  BlockSettings = 'block-settings'
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
  Inline = 'inline'
}

/**
 * IoC keys and related ids for editor plugins (`core.use(MyPlugin)`).
 */
export enum PluginType {
  /**
   * Default plugin type
   */
  Plugin = 'Plugin',

  /**
   * Adapter plugin type
   * Guaranteed to be initialized before any block is created.
   */
  Adapter = 'Adapter'
}

export type EntityType = ToolType | UiComponentType | PluginType;
