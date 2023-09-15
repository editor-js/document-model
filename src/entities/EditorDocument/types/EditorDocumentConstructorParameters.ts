import type { BlockNode } from '../../BlockNode';
import type { Properties } from './Properties';
import { ToolsRegistry } from '../../../tools/ToolsRegistry';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  children?: BlockNode[];

  /**
   * The properties of the document
   */
  properties?: Properties;

  /**
   * ToolsRegistry instance for the current document
   */
  toolsRegistry?: ToolsRegistry;
}
