/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { InlineFormat } from '../InlineFormat/index.js';
import { TextSpan } from '../TextSpan/index.js';
import { FormattedText } from './index.js';
import { expectSpanInvariants } from './spanInvariants.testing.js';

const bold = createInlineToolName('bold');
const italic = createInlineToolName('italic');
const link = createInlineToolName('link');

const boldFormat = new InlineFormat(bold);
const italicFormat = new InlineFormat(italic);

/**
 * Creates link format with passed href
 * @param href - link href
 */
function linkFormat(href: string): InlineFormat {
  return new InlineFormat(link, createInlineToolData({ href }));
}

/**
 * Lists created by the current test, checked for span invariants after each test
 */
let createdLists: FormattedText[] = [];

/**
 * Creates an empty FormattedText and tracks it for the span invariants check
 */
function createEmptyList(): FormattedText {
  const list = new FormattedText();

  createdLists.push(list);

  return list;
}

/**
 * Creates a FormattedText with the passed text and tracks it for the span invariants check
 * @param text - initial text
 */
function createList(text: string): FormattedText {
  const list = createEmptyList();

  list.insert(text, 0);

  return list;
}

describe('FormattedText', () => {
  afterEach(() => {
    createdLists.forEach(list => expectSpanInvariants(list));
    createdLists = [];
  });

  describe('.insert()', () => {
    it('should create a span without formats when inserting into an empty list', () => {
      const list = createEmptyList();

      list.insert('abc', 0);

      expect(list.spans).toEqual([new TextSpan('abc')]);
      expect(list.length).toBe(3);
      expect(list.getText()).toBe('abc');
    });

    it('should not create a span when inserting an empty string into an empty list', () => {
      const list = createEmptyList();

      list.insert('', 0);

      expect(list.spans).toEqual([]);
    });

    it('should insert into the span containing the previous character', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, boldFormat);
      list.insert('X', 2);

      expect(list.spans).toEqual([new TextSpan('abX', [boldFormat]), new TextSpan('cd')]);
    });

    it('should insert into the first span at the zero offset', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, boldFormat);
      list.insert('X', 0);

      expect(list.spans).toEqual([new TextSpan('Xab', [boldFormat]), new TextSpan('cd')]);
    });

    it('should insert into the middle of a later span', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, boldFormat);
      list.insert('X', 3);

      expect(list.spans).toEqual([new TextSpan('ab', [boldFormat]), new TextSpan('cXd')]);
    });
  });

  describe('.remove()', () => {
    it('should return removed text across spans', () => {
      const list = createList('abcdef');

      list.applyFormat(1, 3, boldFormat);

      expect(list.remove(2, 5)).toBe('cde');
      expect(list.spans).toEqual([new TextSpan('a'), new TextSpan('b', [boldFormat]), new TextSpan('f')]);
    });

    it('should join spans with equal formats around the removed text', () => {
      const list = createList('abcdef');

      list.applyFormat(0, 2, boldFormat);
      list.applyFormat(2, 4, italicFormat);
      list.applyFormat(4, 6, boldFormat);
      list.remove(2, 4);

      expect(list.spans).toEqual([new TextSpan('abef', [boldFormat])]);
    });

    it('should leave no spans when all text is removed', () => {
      const list = createList('abcd');

      list.applyFormat(1, 3, boldFormat);

      expect(list.remove(0, 4)).toBe('abcd');
      expect(list.spans).toEqual([]);
      expect(list.length).toBe(0);
    });

    it('should not change spans for an empty range', () => {
      const list = createList('abcd');

      expect(list.remove(2, 2)).toBe('');
      expect(list.spans).toEqual([new TextSpan('abcd')]);
    });
  });

  describe('.applyFormat()', () => {
    it('should cut spans at the range edges', () => {
      const list = createList('abcd');

      list.applyFormat(1, 3, boldFormat);

      expect(list.spans).toEqual([new TextSpan('a'), new TextSpan('bc', [boldFormat]), new TextSpan('d')]);
    });

    it('should not cut spans when the range edges are on span boundaries', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, boldFormat);
      list.applyFormat(0, 2, italicFormat);

      expect(list.spans).toEqual([new TextSpan('ab', [boldFormat, italicFormat]), new TextSpan('cd')]);
    });

    it('should keep formats sorted by tool name', () => {
      const list = createList('abcd');

      list.applyFormat(0, 4, italicFormat);
      list.applyFormat(0, 4, boldFormat);

      expect(list.spans).toEqual([new TextSpan('abcd', [boldFormat, italicFormat])]);
    });

    it('should replace the format of the same tool', () => {
      const list = createList('abcd');

      list.applyFormat(0, 4, linkFormat('a'));
      list.applyFormat(1, 3, linkFormat('b'));

      expect(list.spans).toEqual([
        new TextSpan('a', [linkFormat('a')]),
        new TextSpan('bc', [linkFormat('b')]),
        new TextSpan('d', [linkFormat('a')]),
      ]);
    });

    it('should keep a single span when the same format is set again', () => {
      const list = createList('abcd');

      list.applyFormat(0, 4, linkFormat('a'));
      list.applyFormat(1, 3, linkFormat('a'));

      expect(list.spans).toEqual([new TextSpan('abcd', [linkFormat('a')])]);
    });

    it('should join adjacent spans with equal data', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, linkFormat('a'));
      list.applyFormat(2, 4, linkFormat('a'));

      expect(list.spans).toEqual([new TextSpan('abcd', [linkFormat('a')])]);
    });

    it('should keep adjacent spans with different data apart', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, linkFormat('a'));
      list.applyFormat(2, 4, linkFormat('b'));

      expect(list.spans).toEqual([new TextSpan('ab', [linkFormat('a')]), new TextSpan('cd', [linkFormat('b')])]);
    });

    it('should not change spans for an empty range', () => {
      const list = createList('abcd');

      list.applyFormat(2, 2, boldFormat);

      expect(list.spans).toEqual([new TextSpan('abcd')]);
    });
  });

  describe('.removeFormat()', () => {
    it('should remove the format only within the range', () => {
      const list = createList('abcdef');

      list.applyFormat(0, 6, boldFormat);
      list.removeFormat(2, 4, bold);

      expect(list.spans).toEqual([new TextSpan('ab', [boldFormat]), new TextSpan('cd'), new TextSpan('ef', [boldFormat])]);
    });

    it('should join spans that become equal', () => {
      const list = createList('abcd');

      list.applyFormat(0, 4, boldFormat);
      list.applyFormat(1, 3, italicFormat);
      list.removeFormat(1, 3, italic);

      expect(list.spans).toEqual([new TextSpan('abcd', [boldFormat])]);
    });

    it('should keep formats of other tools', () => {
      const list = createList('abcd');

      list.applyFormat(0, 4, boldFormat);
      list.applyFormat(0, 4, italicFormat);
      list.removeFormat(0, 4, bold);

      expect(list.spans).toEqual([new TextSpan('abcd', [italicFormat])]);
    });
  });

  describe('.getText()', () => {
    it('should return the text of all spans', () => {
      const list = createList('abcd');

      list.applyFormat(1, 3, boldFormat);

      expect(list.getText()).toBe('abcd');
    });
  });

  describe('.spans', () => {
    it('should not expose the internal array', () => {
      const list = createList('abcd');

      (list.spans as TextSpan[]).push(new TextSpan('x'));

      expect(list.spans).toEqual([new TextSpan('abcd')]);
    });
  });

  describe('.toFragments()', () => {
    it('should return no fragments for text without formats', () => {
      expect(createList('abcd').toFragments()).toEqual([]);
    });

    it('should return a fragment spanning several spans while the format continues', () => {
      const list = createList('abcd');

      list.applyFormat(0, 3, boldFormat);
      list.applyFormat(1, 4, italicFormat);

      expect(list.toFragments()).toEqual([
        {
          tool: bold,
          range: [0, 3],
        },
        {
          tool: italic,
          range: [1, 4],
        },
      ]);
    });

    it('should close a fragment when the data of its tool changes', () => {
      const list = createList('abcd');

      list.applyFormat(0, 2, linkFormat('a'));
      list.applyFormat(2, 4, linkFormat('b'));

      expect(list.toFragments()).toEqual([
        {
          tool: link,
          range: [0, 2],
          data: createInlineToolData({ href: 'a' }),
        },
        {
          tool: link,
          range: [2, 4],
          data: createInlineToolData({ href: 'b' }),
        },
      ]);
    });

    it('should open a new fragment when a format comes back after a gap', () => {
      const list = createList('abc');

      list.applyFormat(0, 1, boldFormat);
      list.applyFormat(2, 3, boldFormat);

      expect(list.toFragments()).toEqual([
        {
          tool: bold,
          range: [0, 1],
        },
        {
          tool: bold,
          range: [2, 3],
        },
      ]);
    });

    it('should not add a data key for formats without data', () => {
      const list = createList('ab');

      list.applyFormat(0, 2, boldFormat);

      expect(Object.keys(list.toFragments()[0])).toEqual(['tool', 'range']);
    });

    it('should sort fragments by start, then by end descending, then by tool name', () => {
      const list = createList('abc');

      list.applyFormat(0, 2, italicFormat);
      list.applyFormat(1, 3, boldFormat);
      list.applyFormat(1, 2, linkFormat('a'));

      expect(list.toFragments()).toEqual([
        {
          tool: italic,
          range: [0, 2],
        },
        {
          tool: bold,
          range: [1, 3],
        },
        {
          tool: link,
          range: [1, 2],
          data: createInlineToolData({ href: 'a' }),
        },
      ]);
    });

    it('should order fragments with equal ranges by tool name', () => {
      const list = createList('ab');

      list.applyFormat(0, 2, italicFormat);
      list.applyFormat(0, 2, boldFormat);

      expect(list.toFragments().map(fragment => fragment.tool)).toEqual([bold, italic]);
    });
  });
});
