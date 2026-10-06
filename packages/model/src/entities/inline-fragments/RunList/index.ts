import type { InlineFragment, InlineToolName } from '@editorjs/model-types';
import type { Mark } from '../Mark/index.js';
import { Run } from '../Run/index.js';

/**
 * Fragment being built while sweeping the runs, with the mark it was opened for
 */
interface OpenFragment {
  /**
   * Mark the fragment was opened for
   */
  mark: Mark;

  /**
   * Fragment with its end not set yet
   */
  fragment: InlineFragment;
}

/**
 * Text with inline formatting stored as a list of runs.
 *
 * Keeps the runs canonical after every operation, so the same formatting always gives the same runs:
 * - there are no empty runs
 * - adjacent runs never have equal mark sets
 * - a run has at most one mark per tool, and marks are sorted by tool name
 *
 * Offsets are expected to be valid: validation is up to the caller
 */
export class RunList {
  /**
   * Canonical runs
   */
  #runs: Run[] = [];

  /**
   * Returns text length
   */
  public get length(): number {
    return this.#runs.reduce((length, run) => length + run.text.length, 0);
  }

  /**
   * Returns a copy of the runs
   */
  public get runs(): readonly Run[] {
    return [...this.#runs];
  }

  /**
   * Returns the whole text
   */
  public getText(): string {
    return this.#runs.map(run => run.text).join('');
  }

  /**
   * Inserts text at the offset. Inserted text gets marks of the previous character,
   * or of the first character when inserted at the zero offset
   * @param text - text to insert
   * @param offset - char offset to insert text at
   */
  public insert(text: string, offset: number): void {
    if (this.#runs.length === 0) {
      this.#runs = RunList.#merge([new Run(text)]);

      return;
    }

    const [index, runStart] = this.#findRunForInsert(offset);
    const run = this.#runs[index];
    const cut = offset - runStart;

    this.#runs[index] = new Run(run.text.slice(0, cut) + text + run.text.slice(cut), run.marks);
  }

  /**
   * Removes text in the range
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @returns removed text
   */
  public remove(start: number, end: number): string {
    const startIndex = this.#splitAt(start);
    const endIndex = this.#splitAt(end);
    const removedText = this.#runs
      .splice(startIndex, endIndex - startIndex)
      .map(run => run.text)
      .join('');

    this.#runs = RunList.#merge(this.#runs);

    return removedText;
  }

  /**
   * Applies the mark to the range, replacing a mark of the same tool where there is one
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param mark - mark to apply
   */
  public setMark(start: number, end: number, mark: Mark): void {
    this.#updateMarks(start, end, marks => [...RunList.#withoutTool(marks, mark.tool), mark].sort((a, b) => RunList.#compareTools(a.tool, b.tool)));
  }

  /**
   * Removes the mark of the tool from the range
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param tool - tool to remove the mark of
   */
  public removeMark(start: number, end: number, tool: InlineToolName): void {
    this.#updateMarks(start, end, marks => RunList.#withoutTool(marks, tool));
  }

  /**
   * Returns maximal inline fragments: one fragment per stretch of characters with the same mark,
   * sorted by start, then by end descending, then by tool name
   */
  public toFragments(): InlineFragment[] {
    const fragments: InlineFragment[] = [];
    const open = new Map<InlineToolName, OpenFragment>();
    let offset = 0;

    for (const run of this.#runs) {
      for (const [tool, { mark, fragment }] of open) {
        if (!run.marks.some(runMark => runMark.equals(mark))) {
          fragment.range[1] = offset;
          open.delete(tool);
        }
      }

      for (const mark of run.marks) {
        if (open.has(mark.tool)) {
          continue;
        }

        const fragment: InlineFragment = {
          tool: mark.tool,
          range: [offset, offset],
        };

        if (mark.data !== undefined) {
          fragment.data = mark.data;
        }

        open.set(mark.tool, {
          mark,
          fragment,
        });
        fragments.push(fragment);
      }

      offset += run.text.length;
    }

    for (const { fragment } of open.values()) {
      fragment.range[1] = offset;
    }

    return fragments.sort((a, b) => a.range[0] - b.range[0] || b.range[1] - a.range[1] || RunList.#compareTools(a.tool, b.tool));
  }

  /**
   * Replaces marks of the runs in the range and restores canonical runs
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param update - returns new marks for the passed ones
   */
  #updateMarks(start: number, end: number, update: (marks: readonly Mark[]) => readonly Mark[]): void {
    const startIndex = this.#splitAt(start);
    const endIndex = this.#splitAt(end);

    for (let index = startIndex; index < endIndex; index++) {
      const run = this.#runs[index];

      this.#runs[index] = new Run(run.text, update(run.marks));
    }

    this.#runs = RunList.#merge(this.#runs);
  }

  /**
   * Makes sure there is a run boundary at the offset, cutting a run in two if needed
   * @param offset - char offset
   * @returns index of the run starting at the offset (number of runs for the offset at the end)
   */
  #splitAt(offset: number): number {
    let runStart = 0;

    for (const [index, run] of this.#runs.entries()) {
      if (runStart === offset) {
        return index;
      }

      const runEnd = runStart + run.text.length;

      if (offset < runEnd) {
        const cut = offset - runStart;

        this.#runs.splice(index, 1, new Run(run.text.slice(0, cut), run.marks), new Run(run.text.slice(cut), run.marks));

        return index + 1;
      }

      runStart = runEnd;
    }

    return this.#runs.length;
  }

  /**
   * Returns the run text inserted at the offset goes to, with the offset of its start:
   * the run containing the previous character, or the first run for the zero offset
   * @param offset - char offset
   */
  #findRunForInsert(offset: number): [index: number, runStart: number] {
    let runStart = 0;

    const index = this.#runs.findIndex((run) => {
      if (offset <= runStart + run.text.length) {
        return true;
      }

      runStart += run.text.length;

      return false;
    });

    return [index, runStart];
  }

  /**
   * Returns canonical runs: empty runs are dropped and neighbours with equal mark sets are joined
   * @param runs - runs to merge
   */
  static #merge(runs: Run[]): Run[] {
    const result: Run[] = [];

    for (const run of runs) {
      if (run.text.length === 0) {
        continue;
      }

      const previous = result[result.length - 1];

      if (previous !== undefined && RunList.#isSameMarkSet(previous.marks, run.marks)) {
        result[result.length - 1] = new Run(previous.text + run.text, previous.marks);

        continue;
      }

      result.push(run);
    }

    return result;
  }

  /**
   * Checks if two sorted mark sets are equal
   * @param a - first mark set
   * @param b - second mark set
   */
  static #isSameMarkSet(a: readonly Mark[], b: readonly Mark[]): boolean {
    return a.length === b.length && a.every((mark, index) => mark.equals(b[index]));
  }

  /**
   * Returns marks without the mark of the tool
   * @param marks - sorted marks
   * @param tool - tool to remove the mark of
   */
  static #withoutTool(marks: readonly Mark[], tool: InlineToolName): Mark[] {
    return marks.filter(mark => mark.tool !== tool);
  }

  /**
   * Compares tool names by code units so the order is the same in every environment.
   * Never called with equal names: a run has one mark per tool, and fragments of one tool never share a range
   * @param a - first tool name
   * @param b - second tool name
   */
  static #compareTools(a: InlineToolName, b: InlineToolName): number {
    return a < b ? -1 : 1;
  }
}
