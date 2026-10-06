import type { TextMark } from '../TextMark/index.js';

/**
 * Piece of text with the same set of marks applied to every character.
 * Immutable: edits replace runs with new instances. Invariants over a list of runs are kept by RunList
 */
export class TextRun {
  /**
   * Text of the run
   */
  public readonly text: string;

  /**
   * Marks applied to the whole run, at most one per tool, sorted by tool name
   */
  public readonly marks: readonly TextMark[];

  /**
   * TextRun constructor
   * @param text - text of the run
   * @param [marks] - marks applied to the whole run, at most one per tool, sorted by tool name
   */
  constructor(text: string, marks: readonly TextMark[] = []) {
    this.text = text;
    this.marks = marks;
  }
}
