export interface FormattingNodeConstructorParameters {
  /**
   * The name of the formatting tool applied to the content
   */
  name: string;

  /**
   * Any additional data associated with the formatting
   */
  data: Record<string, unknown>;
}
