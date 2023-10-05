import type { Properties } from './Properties';
import { ToolsRegistry } from '../../../tools/ToolsRegistry';
import { BlockNodeSerialized } from '../../BlockNode/types';

export interface EditorDocumentConstructorParameters {
  /**
   * The child BlockNodes of the EditorDocument
   */
  blocks?: BlockNodeSerialized[];

  /**
   * The properties of the document
   */
  properties?: Properties;

  /**
   * ToolsRegistry instance for the current document
   */
  toolsRegistry?: ToolsRegistry;
}
