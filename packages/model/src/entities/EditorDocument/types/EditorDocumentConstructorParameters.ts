import type { Properties } from './Properties';
import type { ToolsRegistry } from '../../../tools/ToolsRegistry';

export interface EditorDocumentConstructorParameters {
  /**
   * Document identifier
   */
  identifier: string;

  /**
   * The properties of the document
   */
  properties?: Properties;

  /**
   * ToolsRegistry instance for the current document
   */
  toolsRegistry?: ToolsRegistry;
}
