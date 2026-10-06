import type { TextNode } from './index.js';
import { getRunsForTesting } from './index.js';

/**
 * Asserts the canonical run invariants of the TextNode:
 * no empty runs, no neighbours with equal mark sets, at most one mark per tool, marks sorted by tool name
 * @param node - TextNode to check
 */
export function expectRunInvariants(node: TextNode): void {
  const runs = getRunsForTesting(node);

  runs.forEach((run, index) => {
    expect(run.text).not.toBe('');

    const tools = run.marks.map(mark => mark.tool);

    expect(new Set(tools).size).toBe(tools.length);
    expect([...tools].sort()).toEqual(tools);

    if (index > 0) {
      const previous = runs[index - 1].marks;
      const isSameMarkSet = previous.length === run.marks.length && previous.every((mark, markIndex) => mark.equals(run.marks[markIndex]));

      expect(isSameMarkSet).toBe(false);
    }
  });
}
