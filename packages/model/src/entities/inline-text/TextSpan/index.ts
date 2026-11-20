import type { InlineFormat } from '../InlineFormat/index.js';

/**
 * Piece of text with the same set of formats applied to every character.
 * Immutable: edits replace spans with new instances. Invariants over a list of spans are kept by FormattedText
 */
export class TextSpan {
  /**
   * Text of the span
   */
  public readonly text: string;

  /**
   * Formats applied to the whole span, at most one per tool, sorted by tool name
   */
  public readonly formats: readonly InlineFormat[];

  /**
   * TextSpan constructor
   * @param text - text of the span
   * @param [formats] - formats applied to the whole span, at most one per tool, sorted by tool name
   */
  constructor(text: string, formats: readonly InlineFormat[] = []) {
    this.text = text;
    this.formats = formats;
  }
}
