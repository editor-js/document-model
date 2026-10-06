/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import type { Mark, Run } from './index.js';
import {
  findRunForInsert,
  isSameMarkSet,
  mergeRuns,
  removeMark,
  runsToFragments,
  setMark,
  splitAt
} from './index.js';

const bold = createInlineToolName('bold');
const italic = createInlineToolName('italic');
const link = createInlineToolName('link');

const boldMark: Mark = { tool: bold };
const italicMark: Mark = { tool: italic };

/**
 * Creates link mark with passed href
 * @param href - link href
 */
function linkMark(href: string): Mark {
  return {
    tool: link,
    data: createInlineToolData({ href }),
  };
}

/**
 * Creates a run
 * @param text - run text
 * @param marks - run marks
 */
function run(text: string, ...marks: Mark[]): Run {
  return {
    text,
    marks,
  };
}

describe('runs', () => {
  describe('splitAt()', () => {
    it('should cut a run in two when the offset is inside it', () => {
      const runs = [run('abcd', boldMark)];

      const index = splitAt(runs, 1);

      expect(index).toBe(1);
      expect(runs).toEqual([run('a', boldMark), run('bcd', boldMark)]);
    });

    it('should not cut runs when the offset is on a run boundary', () => {
      const runs = [run('ab', boldMark), run('cd')];

      const index = splitAt(runs, 2);

      expect(index).toBe(1);
      expect(runs).toEqual([run('ab', boldMark), run('cd')]);
    });

    it('should return 0 for the zero offset', () => {
      const runs = [run('ab', boldMark)];

      expect(splitAt(runs, 0)).toBe(0);
      expect(runs).toEqual([run('ab', boldMark)]);
    });

    it('should return the number of runs for the offset at the end', () => {
      const runs = [run('ab', boldMark), run('cd')];

      expect(splitAt(runs, 4)).toBe(2);
      expect(runs).toEqual([run('ab', boldMark), run('cd')]);
    });

    it('should cut the right run when the offset is inside a later run', () => {
      const runs = [run('ab', boldMark), run('cdef')];

      const index = splitAt(runs, 3);

      expect(index).toBe(2);
      expect(runs).toEqual([run('ab', boldMark), run('c'), run('def')]);
    });
  });

  describe('findRunForInsert()', () => {
    it('should return the first run for the zero index', () => {
      expect(findRunForInsert([run('ab', boldMark), run('cd')], 0)).toBe(0);
    });

    it('should return the run containing the previous character', () => {
      expect(findRunForInsert([run('ab', boldMark), run('cd')], 2)).toBe(0);
      expect(findRunForInsert([run('ab', boldMark), run('cd')], 3)).toBe(1);
      expect(findRunForInsert([run('ab', boldMark), run('cd')], 4)).toBe(1);
    });
  });

  describe('isSameMarkSet()', () => {
    it('should return true for equal mark sets', () => {
      expect(isSameMarkSet([boldMark, linkMark('a')], [boldMark, linkMark('a')])).toBe(true);
    });

    it('should return false for sets of different size', () => {
      expect(isSameMarkSet([boldMark], [boldMark, italicMark])).toBe(false);
    });

    it('should return false for different tools', () => {
      expect(isSameMarkSet([boldMark], [italicMark])).toBe(false);
    });

    it('should return false for the same tool with different data', () => {
      expect(isSameMarkSet([linkMark('a')], [linkMark('b')])).toBe(false);
    });
  });

  describe('setMark()', () => {
    it('should add a mark keeping marks sorted by tool name', () => {
      expect(setMark([italicMark], boldMark)).toEqual([boldMark, italicMark]);
      expect(setMark([boldMark], italicMark)).toEqual([boldMark, italicMark]);
    });

    it('should replace a mark of the same tool', () => {
      expect(setMark([boldMark, linkMark('a')], linkMark('b'))).toEqual([boldMark, linkMark('b')]);
    });

    it('should not mutate passed marks', () => {
      const marks = [italicMark];

      setMark(marks, boldMark);

      expect(marks).toEqual([italicMark]);
    });
  });

  describe('removeMark()', () => {
    it('should remove a mark of the tool', () => {
      expect(removeMark([boldMark, italicMark], bold)).toEqual([italicMark]);
    });

    it('should return equal marks when there is no mark of the tool', () => {
      expect(removeMark([italicMark], bold)).toEqual([italicMark]);
    });
  });

  describe('mergeRuns()', () => {
    it('should join neighbours with equal mark sets', () => {
      expect(mergeRuns([run('ab', boldMark), run('cd', boldMark)])).toEqual([run('abcd', boldMark)]);
    });

    it('should join neighbours with equal data', () => {
      expect(mergeRuns([run('ab', linkMark('a')), run('cd', linkMark('a'))])).toEqual([run('abcd', linkMark('a'))]);
    });

    it('should keep neighbours with different data apart', () => {
      expect(mergeRuns([run('ab', linkMark('a')), run('cd', linkMark('b'))])).toEqual([run('ab', linkMark('a')), run('cd', linkMark('b'))]);
    });

    it('should drop empty runs and join the runs around them', () => {
      expect(mergeRuns([run('ab', boldMark), run('', italicMark), run('cd', boldMark)])).toEqual([run('abcd', boldMark)]);
    });

    it('should return an empty array when all runs are empty', () => {
      expect(mergeRuns([run(''), run('', boldMark)])).toEqual([]);
    });

    it('should keep neighbours with different mark sets apart', () => {
      expect(mergeRuns([run('ab', boldMark), run('cd', boldMark, italicMark)])).toEqual([run('ab', boldMark), run('cd', boldMark, italicMark)]);
    });
  });

  describe('runsToFragments()', () => {
    it('should return no fragments for runs without marks', () => {
      expect(runsToFragments([run('ab'), run('cd')])).toEqual([]);
    });

    it('should return a fragment spanning several runs while the mark continues', () => {
      expect(runsToFragments([run('a', boldMark), run('bc', boldMark, italicMark), run('d', italicMark)])).toEqual([
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
      expect(runsToFragments([run('ab', linkMark('a')), run('cd', linkMark('b'))])).toEqual([
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
      expect(runsToFragments([run('a', boldMark), run('b'), run('c', boldMark)])).toEqual([
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

    it('should sort fragments by start, then by end descending, then by tool name', () => {
      expect(runsToFragments([run('a', italicMark), run('b', boldMark, italicMark, linkMark('a')), run('c', boldMark)])).toEqual([
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
      expect(runsToFragments([run('ab', boldMark, italicMark)]).map(fragment => fragment.tool)).toEqual([bold, italic]);
    });
  });
});
