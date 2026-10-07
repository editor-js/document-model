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
import { TextMark } from '../TextMark/index.js';
import { RunList } from '../RunList/index.js';

interface TextNodeConstructorOptions {
  value?: string;
  fragments?: InlineFragment[];
}

/**
 * TextNode stores a text value with its inline formatting.
 *
 * The content is kept as a list of runs: pieces of text with the same set of marks (inline tools with their data).
 * Runs are canonical, so the same formatting always gives the same runs and fragments,
 * whatever order formatting operations were applied in.
 */
export class TextNode extends EventBus {
  /**
   * Text and formatting as canonical runs
   */
  #runs = new RunList();

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
    return this.#runs.length;
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

    this.#runs.insert(text, index);

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

    const removedText = this.#runs.remove(start, end);

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

    return this.#runs.getText().slice(start, end);
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

    return this.#runs.toFragments().filter(fragment => start < end
      && fragment.range[0] < end
      && fragment.range[1] > start
      && (tool === undefined || fragment.tool === tool));
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

    this.#runs.setMark(start, end, new TextMark(tool, data));

    /**
     * @todo When format replaces data of an existing mark (e.g. re-applying a link with a new href), the event carries only
     *       the new data. Undo inverts it into unformat, which removes the link instead of restoring the previous href.
     *       The event should carry the replaced fragments so undo can re-apply them
     */
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

    this.#runs.removeMark(start, end, tool);

    this.dispatchEvent(new TextUnformattedEvent(new PartialIndex({ textRange: [start, end] }), { tool }, getContext<string | number>()!));
  }

  /**
   * Initializes the TextNode with passed initial data.
   * Fragments are applied in a fixed order, so conflicting fragments of the same tool
   * (overlapping, with different data) give the same result whatever order they are passed in
   * @param value - initial text value to insert
   * @param fragments - initial inline fragments to apply
   */
  #initialize(value: string, fragments: InlineFragment[]): void {
    if (!value) {
      return;
    }

    this.insertText(value);

    [...fragments]
      .sort(TextNode.#compareForLoading)
      .forEach((fragment) => {
        this.format(fragment.tool, ...fragment.range, fragment.data);
      });
  }

  /**
   * Total order for applying initial fragments: by start, then by end descending, then by tool name, then by data.
   * Fragments that sort later win where fragments of the same tool overlap
   * @param a - first fragment
   * @param b - second fragment
   */
  static #compareForLoading(a: InlineFragment, b: InlineFragment): number {
    return a.range[0] - b.range[0]
      || b.range[1] - a.range[1]
      || TextNode.#compareStrings(a.tool, b.tool)
      || TextNode.#compareStrings(JSON.stringify(a.data ?? {}), JSON.stringify(b.data ?? {}));
  }

  /**
   * Compares strings by code units so the order is the same in every environment
   * @param a - first string
   * @param b - second string
   */
  static #compareStrings(a: string, b: string): number {
    if (a === b) {
      return 0;
    }

    return a < b ? -1 : 1;
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
