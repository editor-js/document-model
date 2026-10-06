/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { InlineFragment, InlineToolData, InlineToolName } from '@editorjs/model-types';
import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { isSameInlineData } from '../../../utils/index.js';
import { TextNode } from './index.js';
import { expectRunInvariants } from './runInvariants.testing.js';

const tools = [createInlineToolName('bold'), createInlineToolName('italic'), createInlineToolName('link')];
const linkData = [createInlineToolData({ href: 'a' }), createInlineToolData({ href: 'b' })];

const SEQUENCES = 200;
const OPERATIONS_PER_SEQUENCE = 30;

/**
 * Character of the reference model with the marks applied to it
 */
interface ReferenceChar {
  char: string;
  marks: Map<InlineToolName, InlineToolData | undefined>;
}

/**
 * Seeded pseudo-random generator (mulberry32), so failures are reproducible
 * @param seed - generator seed
 */
function createRandom(seed: number): (max: number) => number {
  let state = seed;

  return (max: number): number => {
    state = (state + 0x6D2B79F5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

/**
 * Returns maximal fragments of the reference model, sorted as TextNode sorts them
 * @param chars - reference model
 */
function referenceFragments(chars: ReferenceChar[]): InlineFragment[] {
  const fragments: InlineFragment[] = [];

  for (const tool of tools) {
    let start = 0;

    while (start < chars.length) {
      if (!chars[start].marks.has(tool)) {
        start++;

        continue;
      }

      const data = chars[start].marks.get(tool);
      let end = start + 1;

      while (end < chars.length && chars[end].marks.has(tool) && isSameInlineData(chars[end].marks.get(tool), data)) {
        end++;
      }

      const fragment: InlineFragment = {
        tool,
        range: [start, end],
      };

      if (data !== undefined) {
        fragment.data = data;
      }

      fragments.push(fragment);
      start = end;
    }
  }

  return fragments.sort((a, b) => a.range[0] - b.range[0] || b.range[1] - a.range[1] || (a.tool < b.tool ? -1 : 1));
}

/**
 * Returns a random range within the text
 * @param random - random generator
 * @param length - text length
 */
function randomRange(random: (max: number) => number, length: number): [number, number] {
  const a = random(length + 1);
  const b = random(length + 1);

  return [Math.min(a, b), Math.max(a, b)];
}

/**
 * Applies a random operation to both the TextNode and the reference model
 * @param random - random generator
 * @param node - TextNode under test
 * @param chars - reference model, modified in place
 */
function applyRandomOperation(random: (max: number) => number, node: TextNode, chars: ReferenceChar[]): void {
  const operation = random(4);

  if (operation === 0) {
    const index = random(chars.length + 1);
    const text = 'xyz'.slice(0, random(3) + 1);
    const source = chars[index > 0 ? index - 1 : 0];

    node.insertText(text, index);
    chars.splice(index, 0, ...text.split('').map(char => ({
      char,
      marks: new Map(source?.marks ?? []),
    })));

    return;
  }

  const [start, end] = randomRange(random, chars.length);

  if (operation === 1) {
    node.removeText(start, end);
    chars.splice(start, end - start);

    return;
  }

  const tool = tools[random(tools.length)];

  if (operation === 2) {
    const data = tool === tools[2] ? linkData[random(linkData.length)] : undefined;

    node.format(tool, start, end, data);
    chars.slice(start, end).forEach(char => char.marks.set(tool, data));

    return;
  }

  node.unformat(tool, start, end);
  chars.slice(start, end).forEach(char => char.marks.delete(tool));
}

/**
 * Shuffles an array with the passed random generator
 * @param random - random generator
 * @param items - items to shuffle
 */
function shuffle<T>(random: (max: number) => number, items: T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const other = random(index + 1);

    [result[index], result[other]] = [result[other], result[index]];
  }

  return result;
}

describe('TextNode random operation sequences', () => {
  for (let seed = 1; seed <= SEQUENCES; seed++) {
    it(`should match the per-character reference model (seed ${seed})`, () => {
      const random = createRandom(seed);
      const initialText = 'abcdefghij'.slice(0, random(11));
      const node = new TextNode({ value: initialText });
      const chars: ReferenceChar[] = initialText.split('').map(char => ({
        char,
        marks: new Map(),
      }));

      for (let step = 0; step < OPERATIONS_PER_SEQUENCE; step++) {
        applyRandomOperation(random, node, chars);

        expectRunInvariants(node);
        expect(node.getText()).toBe(chars.map(char => char.char).join(''));
        expect(node.getFragments()).toEqual(referenceFragments(chars));
      }

      const { value, fragments } = node.serialized;
      const reloaded = new TextNode({
        value,
        fragments,
      });
      const shuffled = new TextNode({
        value,
        fragments: shuffle(random, fragments),
      });

      expect(reloaded.getFragments()).toEqual(fragments);
      expect(shuffled.getFragments()).toEqual(fragments);
      expectRunInvariants(shuffled);
    });
  }
});
