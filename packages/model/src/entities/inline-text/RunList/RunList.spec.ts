/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { TextMark } from '../TextMark/index.js';
import { TextRun } from '../TextRun/index.js';
import { RunList } from './index.js';
import { expectRunInvariants } from './runInvariants.testing.js';

const bold = createInlineToolName('bold');
const italic = createInlineToolName('italic');
const link = createInlineToolName('link');

const boldMark = new TextMark(bold);
const italicMark = new TextMark(italic);

/**
 * Creates link mark with passed href
 * @param href - link href
 */
function linkMark(href: string): TextMark {
  return new TextMark(link, createInlineToolData({ href }));
}

/**
 * Lists created by the current test, checked for run invariants after each test
 */
let createdLists: RunList[] = [];

/**
 * Creates an empty run list and tracks it for the run invariants check
 */
function createEmptyList(): RunList {
  const list = new RunList();

  createdLists.push(list);

  return list;
}

/**
 * Creates a run list with the passed text and tracks it for the run invariants check
 * @param text - initial text
 */
function createList(text: string): RunList {
  const list = createEmptyList();

  list.insert(text, 0);

  return list;
}

describe('RunList', () => {
  afterEach(() => {
    createdLists.forEach(list => expectRunInvariants(list));
    createdLists = [];
  });

  describe('.insert()', () => {
    it('should create a run without marks when inserting into an empty list', () => {
      const list = createEmptyList();

      list.insert('abc', 0);

      expect(list.runs).toEqual([new TextRun('abc')]);
      expect(list.length).toBe(3);
      expect(list.getText()).toBe('abc');
    });

    it('should not create a run when inserting an empty string into an empty list', () => {
      const list = createEmptyList();

      list.insert('', 0);

      expect(list.runs).toEqual([]);
    });

    it('should insert into the run containing the previous character', () => {
      const list = createList('abcd');

      list.setMark(0, 2, boldMark);
      list.insert('X', 2);

      expect(list.runs).toEqual([new TextRun('abX', [boldMark]), new TextRun('cd')]);
    });

    it('should insert into the first run at the zero offset', () => {
      const list = createList('abcd');

      list.setMark(0, 2, boldMark);
      list.insert('X', 0);

      expect(list.runs).toEqual([new TextRun('Xab', [boldMark]), new TextRun('cd')]);
    });

    it('should insert into the middle of a later run', () => {
      const list = createList('abcd');

      list.setMark(0, 2, boldMark);
      list.insert('X', 3);

      expect(list.runs).toEqual([new TextRun('ab', [boldMark]), new TextRun('cXd')]);
    });
  });

  describe('.remove()', () => {
    it('should return removed text across runs', () => {
      const list = createList('abcdef');

      list.setMark(1, 3, boldMark);

      expect(list.remove(2, 5)).toBe('cde');
      expect(list.runs).toEqual([new TextRun('a'), new TextRun('b', [boldMark]), new TextRun('f')]);
    });

    it('should join runs with equal marks around the removed text', () => {
      const list = createList('abcdef');

      list.setMark(0, 2, boldMark);
      list.setMark(2, 4, italicMark);
      list.setMark(4, 6, boldMark);
      list.remove(2, 4);

      expect(list.runs).toEqual([new TextRun('abef', [boldMark])]);
    });

    it('should leave no runs when all text is removed', () => {
      const list = createList('abcd');

      list.setMark(1, 3, boldMark);

      expect(list.remove(0, 4)).toBe('abcd');
      expect(list.runs).toEqual([]);
      expect(list.length).toBe(0);
    });

    it('should not change runs for an empty range', () => {
      const list = createList('abcd');

      expect(list.remove(2, 2)).toBe('');
      expect(list.runs).toEqual([new TextRun('abcd')]);
    });
  });

  describe('.setMark()', () => {
    it('should cut runs at the range edges', () => {
      const list = createList('abcd');

      list.setMark(1, 3, boldMark);

      expect(list.runs).toEqual([new TextRun('a'), new TextRun('bc', [boldMark]), new TextRun('d')]);
    });

    it('should not cut runs when the range edges are on run boundaries', () => {
      const list = createList('abcd');

      list.setMark(0, 2, boldMark);
      list.setMark(0, 2, italicMark);

      expect(list.runs).toEqual([new TextRun('ab', [boldMark, italicMark]), new TextRun('cd')]);
    });

    it('should keep marks sorted by tool name', () => {
      const list = createList('abcd');

      list.setMark(0, 4, italicMark);
      list.setMark(0, 4, boldMark);

      expect(list.runs).toEqual([new TextRun('abcd', [boldMark, italicMark])]);
    });

    it('should replace the mark of the same tool', () => {
      const list = createList('abcd');

      list.setMark(0, 4, linkMark('a'));
      list.setMark(1, 3, linkMark('b'));

      expect(list.runs).toEqual([
        new TextRun('a', [linkMark('a')]),
        new TextRun('bc', [linkMark('b')]),
        new TextRun('d', [linkMark('a')]),
      ]);
    });

    it('should keep a single run when the same mark is set again', () => {
      const list = createList('abcd');

      list.setMark(0, 4, linkMark('a'));
      list.setMark(1, 3, linkMark('a'));

      expect(list.runs).toEqual([new TextRun('abcd', [linkMark('a')])]);
    });

    it('should join adjacent runs with equal data', () => {
      const list = createList('abcd');

      list.setMark(0, 2, linkMark('a'));
      list.setMark(2, 4, linkMark('a'));

      expect(list.runs).toEqual([new TextRun('abcd', [linkMark('a')])]);
    });

    it('should keep adjacent runs with different data apart', () => {
      const list = createList('abcd');

      list.setMark(0, 2, linkMark('a'));
      list.setMark(2, 4, linkMark('b'));

      expect(list.runs).toEqual([new TextRun('ab', [linkMark('a')]), new TextRun('cd', [linkMark('b')])]);
    });

    it('should not change runs for an empty range', () => {
      const list = createList('abcd');

      list.setMark(2, 2, boldMark);

      expect(list.runs).toEqual([new TextRun('abcd')]);
    });
  });

  describe('.removeMark()', () => {
    it('should remove the mark only within the range', () => {
      const list = createList('abcdef');

      list.setMark(0, 6, boldMark);
      list.removeMark(2, 4, bold);

      expect(list.runs).toEqual([new TextRun('ab', [boldMark]), new TextRun('cd'), new TextRun('ef', [boldMark])]);
    });

    it('should join runs that become equal', () => {
      const list = createList('abcd');

      list.setMark(0, 4, boldMark);
      list.setMark(1, 3, italicMark);
      list.removeMark(1, 3, italic);

      expect(list.runs).toEqual([new TextRun('abcd', [boldMark])]);
    });

    it('should keep marks of other tools', () => {
      const list = createList('abcd');

      list.setMark(0, 4, boldMark);
      list.setMark(0, 4, italicMark);
      list.removeMark(0, 4, bold);

      expect(list.runs).toEqual([new TextRun('abcd', [italicMark])]);
    });
  });

  describe('.getText()', () => {
    it('should return the text of all runs', () => {
      const list = createList('abcd');

      list.setMark(1, 3, boldMark);

      expect(list.getText()).toBe('abcd');
    });
  });

  describe('.runs', () => {
    it('should not expose the internal array', () => {
      const list = createList('abcd');

      (list.runs as TextRun[]).push(new TextRun('x'));

      expect(list.runs).toEqual([new TextRun('abcd')]);
    });
  });

  describe('.toFragments()', () => {
    it('should return no fragments for text without marks', () => {
      expect(createList('abcd').toFragments()).toEqual([]);
    });

    it('should return a fragment spanning several runs while the mark continues', () => {
      const list = createList('abcd');

      list.setMark(0, 3, boldMark);
      list.setMark(1, 4, italicMark);

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

      list.setMark(0, 2, linkMark('a'));
      list.setMark(2, 4, linkMark('b'));

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

    it('should open a new fragment when a mark comes back after a gap', () => {
      const list = createList('abc');

      list.setMark(0, 1, boldMark);
      list.setMark(2, 3, boldMark);

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

    it('should not add a data key for marks without data', () => {
      const list = createList('ab');

      list.setMark(0, 2, boldMark);

      expect(Object.keys(list.toFragments()[0])).toEqual(['tool', 'range']);
    });

    it('should sort fragments by start, then by end descending, then by tool name', () => {
      const list = createList('abc');

      list.setMark(0, 2, italicMark);
      list.setMark(1, 3, boldMark);
      list.setMark(1, 2, linkMark('a'));

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

      list.setMark(0, 2, italicMark);
      list.setMark(0, 2, boldMark);

      expect(list.toFragments().map(fragment => fragment.tool)).toEqual([bold, italic]);
    });
  });
});
