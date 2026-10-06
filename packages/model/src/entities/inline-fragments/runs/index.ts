import type { InlineFragment, InlineToolData, InlineToolName } from '@editorjs/model-types';
import { isSameInlineData } from '../../../utils/index.js';

/**
 * Inline tool applied to a run
 */
export interface Mark {
  /**
   * Name of the inline tool
   */
  tool: InlineToolName;

  /**
   * Inline tool data if applicable
   */
  data?: InlineToolData;
}

/**
 * Piece of text with the same set of marks applied to every character.
 *
 * Runs are kept canonical by TextNode:
 * - there are no empty runs
 * - adjacent runs never have equal mark sets
 * - a run has at most one mark per tool, and marks are sorted by tool name
 *
 * Mark arrays and Mark objects are never mutated, so they can be shared between runs
 */
export interface Run {
  /**
   * Text of the run
   */
  text: string;

  /**
   * Marks applied to the whole run
   */
  marks: Mark[];
}

/**
 * Compares tool names by code units so the order is the same in every environment.
 * Never called with equal names: a run has one mark per tool, and fragments of one tool never share a range
 * @param a - first tool name
 * @param b - second tool name
 */
function compareTools(a: InlineToolName, b: InlineToolName): number {
  return a < b ? -1 : 1;
}

/**
 * Checks if two marks are equal: same tool and equal data
 * @param a - first mark
 * @param b - second mark
 */
function isSameMark(a: Mark, b: Mark): boolean {
  return a.tool === b.tool && isSameInlineData(a.data, b.data);
}

/**
 * Checks if two sorted mark sets are equal
 * @param a - first mark set
 * @param b - second mark set
 */
export function isSameMarkSet(a: Mark[], b: Mark[]): boolean {
  return a.length === b.length && a.every((mark, index) => isSameMark(mark, b[index]));
}

/**
 * Returns new mark set without the mark of the passed tool
 * @param marks - sorted mark set
 * @param tool - tool to remove
 */
export function removeMark(marks: Mark[], tool: InlineToolName): Mark[] {
  return marks.filter(mark => mark.tool !== tool);
}

/**
 * Returns new mark set with the passed mark added, replacing a mark of the same tool if there is one
 * @param marks - sorted mark set
 * @param mark - mark to set
 */
export function setMark(marks: Mark[], mark: Mark): Mark[] {
  return [...removeMark(marks, mark.tool), mark].sort((a, b) => compareTools(a.tool, b.tool));
}

/**
 * Makes sure there is a run boundary at the passed offset, cutting a run in two if needed
 * @param runs - runs to split, modified in place
 * @param offset - char offset, expected to be in [0, total length]
 * @returns index of the run starting at the offset (runs.length for the offset at the end)
 */
export function splitAt(runs: Run[], offset: number): number {
  let runStart = 0;

  for (const [index, run] of runs.entries()) {
    if (runStart === offset) {
      return index;
    }

    const runEnd = runStart + run.text.length;

    if (offset < runEnd) {
      const cut = offset - runStart;

      runs.splice(index + 1, 0, {
        text: run.text.slice(cut),
        marks: run.marks,
      });
      runs[index] = {
        text: run.text.slice(0, cut),
        marks: run.marks,
      };

      return index + 1;
    }

    runStart = runEnd;
  }

  return runs.length;
}

/**
 * Returns index of the run text inserted at the passed offset goes to:
 * the run containing the previous character, or the first run for the zero offset
 * @param runs - non-empty runs
 * @param offset - char offset, expected to be in [0, total length]
 */
export function findRunForInsert(runs: Run[], offset: number): number {
  let runEnd = 0;

  return runs.findIndex((run) => {
    runEnd += run.text.length;

    return offset <= runEnd;
  });
}

/**
 * Returns canonical runs: empty runs are dropped and neighbours with equal mark sets are joined
 * @param runs - runs to merge
 */
export function mergeRuns(runs: Run[]): Run[] {
  const result: Run[] = [];

  for (const run of runs) {
    if (run.text.length === 0) {
      continue;
    }

    const previous = result[result.length - 1];

    if (previous !== undefined && isSameMarkSet(previous.marks, run.marks)) {
      result[result.length - 1] = {
        text: previous.text + run.text,
        marks: previous.marks,
      };

      continue;
    }

    result.push(run);
  }

  return result;
}

/**
 * Compares fragments: by start ascending, then by end descending, then by tool name
 * @param a - first fragment
 * @param b - second fragment
 */
function compareFragments(a: InlineFragment, b: InlineFragment): number {
  return a.range[0] - b.range[0] || b.range[1] - a.range[1] || compareTools(a.tool, b.tool);
}

/**
 * Returns maximal inline fragments for the runs: one fragment per stretch of characters with the same mark
 * @param runs - canonical runs
 */
export function runsToFragments(runs: Run[]): InlineFragment[] {
  const fragments: InlineFragment[] = [];
  const open = new Map<InlineToolName, InlineFragment>();
  let offset = 0;

  for (const run of runs) {
    for (const [tool, fragment] of open) {
      const mark = run.marks.find(m => m.tool === tool);

      if (mark === undefined || !isSameInlineData(mark.data, fragment.data)) {
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

      open.set(mark.tool, fragment);
      fragments.push(fragment);
    }

    offset += run.text.length;
  }

  for (const fragment of open.values()) {
    fragment.range[1] = offset;
  }

  return fragments.sort(compareFragments);
}
