import { FormattingNodeName } from './FormattingNodeName';

export interface FormattingNodeConstructorParameters {
  /**
   * The name of the formatting tool applied to the content
   */
  name: FormattingNodeName;

  /**
   * Any additional data associated with the formatting
   */
  data: Record<string, unknown>;
}
