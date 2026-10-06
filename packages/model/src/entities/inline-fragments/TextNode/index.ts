import type { InlineToolName, InlineToolData, InlineFragment, TextNodeSerialized } from '@editorjs/model-types';
import {
  BlockChildType,
  EventBus,
  NODE_TYPE_HIDDEN_PROP,
  PartialIndex,
  TextAddedEvent,
  TextFormattedEvent,
  TextRemovedEvent,
  TextUnformattedEvent
} from '@editorjs/model-types';
import { getContext } from '../../../utils/Context.js';
import type { Mark, Run } from '../runs/index.js';
import {
  findRunForInsert,
  mergeRuns,
  removeMark,
  runsToFragments,
  setMark,
  splitAt
} from '../runs/index.js';

interface TextNodeConstructorOptions {
  value?: string;
  fragments?: InlineFragment[];
}

/**
 * Reads runs of a TextNode, assigned in the class static block
 */
let readRuns: (node: TextNode) => readonly Run[];

/**
 * TextNode stores a text value with its inline formatting.
 *
 * The content is kept as a list of runs: pieces of text with the same set of marks (inline tools with their data).
 * Runs are canonical, so the same formatting always gives the same runs and fragments,
 * whatever order formatting operations were applied in.
 */
export class TextNode extends EventBus {
  /**
   * Canonical runs, see Run for the invariants
   */
  #runs: Run[] = [];

  static {
    readRuns = node => node.#runs;
  }

  /**
   * TextNode constructor
   * @param options - TextNode constructor options
   */
  // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
  constructor(options: TextNodeConstructorOptions = {}) {
    const { value = '', fragments = [] } = options;

    super();

    this.#initialize(value, fragments);
  }

  /**
   * Returns text length
   */
  public get length(): number {
    return this.#runs.reduce((length, run) => length + run.text.length, 0);
  }

  /**
   * Returns serialized TextNode: text value and inline fragments
   */
  public get serialized(): TextNodeSerialized {
    return {
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text as const,
      value: this.getText(),
      fragments: this.getFragments(),
    };
  }

  /**
   * Inserts text to the specified index, by default appends text to the end of the current value.
   * Inserted text gets formatting of the previous character, or of the first character when inserted at the start
   * @param text - text to insert
   * @param [index] - char index where to insert text
   */
  public insertText(text: string, index = this.length): void {
    this.#validateIndex(index);

    if (this.#runs.length === 0) {
      this.#runs = mergeRuns([{
        text,
        marks: [],
      }]);
    } else {
      const runIndex = findRunForInsert(this.#runs, index);
      const run = this.#runs[runIndex];
      const offset = index - this.#getRunStart(runIndex);

      this.#runs[runIndex] = {
        text: run.text.slice(0, offset) + text + run.text.slice(offset),
        marks: run.marks,
      };
    }

    this.dispatchEvent(new TextAddedEvent(new PartialIndex({ textRange: [index, index] }), text, getContext<string | number>()!));
  }

  /**
   * Removes text form the specified range
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @returns removed text
   */
  public removeText(start = 0, end = this.length): string {
    this.#validateRange(start, end);

    const startIndex = splitAt(this.#runs, start);
    const endIndex = splitAt(this.#runs, end);
    const removedText = this.#runs
      .splice(startIndex, endIndex - startIndex)
      .map(run => run.text)
      .join('');

    this.#runs = mergeRuns(this.#runs);

    this.dispatchEvent(new TextRemovedEvent(new PartialIndex({ textRange: [start, end] }), removedText, getContext<string | number>()!));

    return removedText;
  }

  /**
   * Returns text from the specified range
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  public getText(start = 0, end = this.length): string {
    this.#validateRange(start, end);

    return this.#runs
      .map(run => run.text)
      .join('')
      .slice(start, end);
  }

  /**
   * Returns maximal inline fragments sharing at least one character with the specified range.
   * Fragments are returned whole and sorted by start, then by end descending, then by tool name
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   * @param [tool] - name of the Inline Tool to return fragments of
   */
  public getFragments(start = 0, end = this.length, tool?: InlineToolName): InlineFragment[] {
    this.#validateRange(start, end);

    if (start === end) {
      return [];
    }

    return runsToFragments(this.#runs)
      .filter(fragment => fragment.range[0] < end && fragment.range[1] > start)
      .filter(fragment => tool === undefined || fragment.tool === tool);
  }

  /**
   * Applies formatting to the text with specified inline tool in the specified range.
   * If some characters already have that tool, its data is replaced with the passed one
   * @param tool - name of inline tool to apply
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): void {
    this.#validateRange(start, end);

    const mark: Mark = {
      tool,
      data,
    };

    this.#updateMarks(start, end, marks => setMark(marks, mark));

    this.dispatchEvent(
      new TextFormattedEvent(
        new PartialIndex({ textRange: [start, end] }),
        {
          tool,
          data,
        },
        getContext<string | number>()!
      )
    );
  }

  /**
   * Removes formatting from the text for a specified inline tool in the specified range
   * @param tool - name of inline tool to remove
   * @param start - char start index of the range
   * @param end - char end index of the range
   */
  public unformat(tool: InlineToolName, start: number, end: number): void {
    this.#validateRange(start, end);

    this.#updateMarks(start, end, marks => removeMark(marks, tool));

    this.dispatchEvent(new TextUnformattedEvent(new PartialIndex({ textRange: [start, end] }), { tool }, getContext<string | number>()!));
  }

  /**
   * Replaces marks of the runs in the range and restores canonical runs
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param update - returns new marks for the passed ones
   */
  #updateMarks(start: number, end: number, update: (marks: Mark[]) => Mark[]): void {
    const startIndex = splitAt(this.#runs, start);
    const endIndex = splitAt(this.#runs, end);

    for (let index = startIndex; index < endIndex; index++) {
      const run = this.#runs[index];

      this.#runs[index] = {
        text: run.text,
        marks: update(run.marks),
      };
    }

    this.#runs = mergeRuns(this.#runs);
  }

  /**
   * Returns char offset of the run start
   * @param runIndex - index of the run
   */
  #getRunStart(runIndex: number): number {
    return this.#runs
      .slice(0, runIndex)
      .reduce((offset, run) => offset + run.text.length, 0);
  }

  /**
   * Initializes the TextNode with passed initial data
   * @param value - initial text value to insert
   * @param fragments - initial inline fragments to apply
   */
  #initialize(value: string, fragments: InlineFragment[]): void {
    if (!value) {
      return;
    }

    this.insertText(value);

    fragments.forEach((fragment) => {
      this.format(fragment.tool, ...fragment.range, fragment.data);
    });
  }

  /**
   * Validates if range has valid start and end points
   * @param start - range start
   * @param end - range end
   * @throws Error if range is invalid
   */
  #validateRange(start: number, end: number): void {
    this.#validateIndex(start);
    this.#validateIndex(end);

    if (end < start) {
      throw new Error(`The end of range must be greater or equal than the start: [${start}, ${end}]`);
    }
  }

  /**
   * Validates index
   * @param index - char index to validate
   * @throws Error if index is out of the text length
   */
  #validateIndex(index: number): void {
    if (index < 0 || index > this.length) {
      // Stryker disable next-line StringLiteral
      throw new Error(`Index ${index} is not in valid range [0, ${this.length}]`);
    }
  }
}

/**
 * Returns runs of the TextNode. For tests only, not exported from the package
 * @param node - TextNode to read runs of
 */
export function getRunsForTesting(node: TextNode): readonly Run[] {
  return readRuns(node);
}
