import type { ToolSettings, ToolConstructable } from '@editorjs/editorjs';
import type { BlockToolConstructor, InlineToolConstructor } from '@/entities';

/**
 * Users can pass tool's config in two ways:
 *   toolName: ToolClass
 *   or
 *   toolName: {
 *     class: ToolClass,
 *     // .. other options
 *   }
 *
 * This interface unifies these variants to a single format
 */
export type UnifiedToolConfig = Record<string, Omit<ToolSettings, 'class'> & {
  /**
   * Tool constructor
   */
  class: ToolConstructable | BlockToolConstructor | InlineToolConstructor;

  /**
   * Specifies if tool is internal
   *
   * Internal tools set it to true, external tools omit it
   */
  isInternal?: boolean;
}>;
