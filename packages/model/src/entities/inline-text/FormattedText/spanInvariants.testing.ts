import type { FormattedText } from './index.js';

/**
 * Asserts the canonical span invariants of the FormattedText:
 * no empty spans, no neighbours with equal format sets, at most one format per tool, formats sorted by tool name
 * @param list - FormattedText to check
 */
export function expectSpanInvariants(list: FormattedText): void {
  const spans = list.spans;

  spans.forEach((span, index) => {
    expect(span.text).not.toBe('');

    const tools = span.formats.map(format => format.tool);

    expect(new Set(tools).size).toBe(tools.length);
    expect([...tools].sort()).toEqual(tools);

    if (index > 0) {
      const previous = spans[index - 1].formats;
      const isSameFormatSet = previous.length === span.formats.length && previous.every((format, markIndex) => format.equals(span.formats[markIndex]));

      expect(isSameFormatSet).toBe(false);
    }
  });
}
