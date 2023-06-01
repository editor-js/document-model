import { FormattingNodeName } from './FormattingNodeName';
import { FormattingNodeData } from './FormattingNodeData';
import { FormattingNode } from '../index';

export interface FormattingNodeConstructorParameters {
  /**
   * The name of the formatting tool applied to the content
   */
  name: FormattingNodeName;

  /**
   * Any additional data associated with the formatting
   */
  data?: FormattingNodeData;

  parent?: FormattingNode;
}
