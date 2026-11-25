import type { InlineFragment, InlineToolName } from '@editorjs/model-types';
import { cloneInlineData } from '../../../utils/index.js';
import type { InlineFormat } from '../InlineFormat/index.js';
import { TextSpan } from '../TextSpan/index.js';

/**
 * Fragment being built while sweeping the spans, with the format it was opened for
 */
interface OpenFragment {
  /**
   * Format the fragment was opened for
   */
  format: InlineFormat;

  /**
   * Fragment with its end not set yet
   */
  fragment: InlineFragment;
}

/**
 * Text with inline formatting stored as a list of spans.
 *
 * Keeps the spans canonical after every operation, so the same formatting always gives the same spans:
 * - there are no empty spans
 * - adjacent spans never have equal format sets
 * - a span has at most one format per tool, and formats are sorted by tool name
 *
 * Offsets are expected to be valid: validation is up to the caller
 */
export class FormattedText {
  /**
   * Canonical spans
   */
  #spans: TextSpan[] = [];

  /**
   * Text length, kept in sync by insert() and remove()
   */
  #length = 0;

  /**
   * Returns text length
   */
  public get length(): number {
    return this.#length;
  }

  /**
   * Returns a copy of the spans
   */
  public get spans(): readonly TextSpan[] {
    return [...this.#spans];
  }

  /**
   * Returns the whole text
   */
  public getText(): string {
    return this.#spans.map(span => span.text).join('');
  }

  /**
   * Inserts text at the offset. Inserted text gets formats of the previous character,
   * or of the first character when inserted at the zero offset
   * @param text - text to insert
   * @param offset - char offset to insert text at
   */
  public insert(text: string, offset: number): void {
    if (text.length === 0) {
      return;
    }

    this.#length += text.length;

    if (this.#spans.length === 0) {
      this.#spans = [new TextSpan(text)];

      return;
    }

    const [index, spanStart] = this.#findSpanForInsert(offset);
    const span = this.#spans[index];
    const cut = offset - spanStart;

    this.#spans[index] = new TextSpan(span.text.slice(0, cut) + text + span.text.slice(cut), span.formats);
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
    const removedText = this.#spans
      .splice(startIndex, endIndex - startIndex)
      .map(span => span.text)
      .join('');

    this.#length -= removedText.length;
    this.#spans = FormattedText.#merge(this.#spans);

    return removedText;
  }

  /**
   * Applies the format to the range, replacing a format of the same tool where there is one
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param format - format to apply
   */
  public applyFormat(start: number, end: number, format: InlineFormat): void {
    this.#updateFormats(start, end, formats => [...FormattedText.#withoutTool(formats, format.tool), format].sort((a, b) => FormattedText.#compareTools(a.tool, b.tool)));
  }

  /**
   * Removes the format of the tool from the range
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param tool - tool to remove the format of
   */
  public removeFormat(start: number, end: number, tool: InlineToolName): void {
    this.#updateFormats(start, end, formats => FormattedText.#withoutTool(formats, tool));
  }

  /**
   * Returns maximal inline fragments: one fragment per stretch of characters with the same format,
   * sorted by start, then by end descending, then by tool name
   */
  public toFragments(): InlineFragment[] {
    const fragments: InlineFragment[] = [];
    const open = new Map<InlineToolName, OpenFragment>();
    let offset = 0;

    for (const span of this.#spans) {
      for (const [tool, { format, fragment }] of open) {
        if (!span.formats.some(spanFormat => spanFormat.equals(format))) {
          fragment.range[1] = offset;
          open.delete(tool);
        }
      }

      for (const format of span.formats) {
        if (open.has(format.tool)) {
          continue;
        }

        const fragment: InlineFragment = {
          tool: format.tool,
          range: [offset, offset],
        };

        if (format.data !== undefined) {
          fragment.data = cloneInlineData(format.data);
        }

        open.set(format.tool, {
          format,
          fragment,
        });
        fragments.push(fragment);
      }

      offset += span.text.length;
    }

    for (const { fragment } of open.values()) {
      fragment.range[1] = offset;
    }

    return fragments.sort((a, b) => a.range[0] - b.range[0] || b.range[1] - a.range[1] || FormattedText.#compareTools(a.tool, b.tool));
  }

  /**
   * Replaces formats of the spans in the range and restores canonical spans
   * @param start - char start offset of the range
   * @param end - char end offset of the range
   * @param update - returns new formats for the passed ones
   */
  #updateFormats(start: number, end: number, update: (formats: readonly InlineFormat[]) => readonly InlineFormat[]): void {
    const startIndex = this.#splitAt(start);
    const endIndex = this.#splitAt(end);

    for (let index = startIndex; index < endIndex; index++) {
      const span = this.#spans[index];

      this.#spans[index] = new TextSpan(span.text, update(span.formats));
    }

    this.#spans = FormattedText.#merge(this.#spans);
  }

  /**
   * Makes sure there is a span boundary at the offset, cutting a span in two if needed
   * @param offset - char offset
   * @returns index of the span starting at the offset (number of spans for the offset at the end)
   */
  #splitAt(offset: number): number {
    let spanStart = 0;

    for (const [index, span] of this.#spans.entries()) {
      if (spanStart === offset) {
        return index;
      }

      const spanEnd = spanStart + span.text.length;

      if (offset < spanEnd) {
        const cut = offset - spanStart;

        this.#spans.splice(index, 1, new TextSpan(span.text.slice(0, cut), span.formats), new TextSpan(span.text.slice(cut), span.formats));

        return index + 1;
      }

      spanStart = spanEnd;
    }

    return this.#spans.length;
  }

  /**
   * Returns the span text inserted at the offset goes to, with the offset of its start:
   * the span containing the previous character, or the first span for the zero offset
   * @param offset - char offset
   */
  #findSpanForInsert(offset: number): [index: number, spanStart: number] {
    let spanStart = 0;

    const index = this.#spans.findIndex((span) => {
      if (offset <= spanStart + span.text.length) {
        return true;
      }

      spanStart += span.text.length;

      return false;
    });

    return [index, spanStart];
  }

  /**
   * Returns canonical spans: neighbours with equal format sets are joined.
   * Spans are never empty here: splitting only cuts inside a span, and empty text is never inserted
   * @param spans - spans to merge
   */
  static #merge(spans: TextSpan[]): TextSpan[] {
    const result: TextSpan[] = [];

    for (const span of spans) {
      const previous = result[result.length - 1];

      if (previous !== undefined && FormattedText.#isSameFormatSet(previous.formats, span.formats)) {
        result[result.length - 1] = new TextSpan(previous.text + span.text, previous.formats);

        continue;
      }

      result.push(span);
    }

    return result;
  }

  /**
   * Checks if two sorted format sets are equal
   * @param a - first format set
   * @param b - second format set
   */
  static #isSameFormatSet(a: readonly InlineFormat[], b: readonly InlineFormat[]): boolean {
    return a.length === b.length && a.every((format, index) => format.equals(b[index]));
  }

  /**
   * Returns formats without the format of the tool
   * @param formats - sorted formats
   * @param tool - tool to remove the format of
   */
  static #withoutTool(formats: readonly InlineFormat[], tool: InlineToolName): InlineFormat[] {
    return formats.filter(format => format.tool !== tool);
  }

  /**
   * Compares tool names by code units so the order is the same in every environment.
   * Never called with equal names: a span has one format per tool, and fragments of one tool never share a range
   * @param a - first tool name
   * @param b - second tool name
   */
  static #compareTools(a: InlineToolName, b: InlineToolName): number {
    return a < b ? -1 : 1;
  }
}
