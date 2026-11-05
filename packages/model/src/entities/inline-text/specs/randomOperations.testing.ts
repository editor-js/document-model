/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { InlineFragment, InlineToolData, InlineToolName } from '@editorjs/model-types';
import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { isSameInlineData } from '../../../utils/index.js';

const tools = [createInlineToolName('bold'), createInlineToolName('italic'), createInlineToolName('link')];
const linkData = [createInlineToolData({ href: 'a' }), createInlineToolData({ href: 'b' })];
const emptyData = createInlineToolData({});

/**
 * Checks if inline tool data is missing or empty: the model stores both as no data
 * @param data - inline tool data
 */
function isEmptyData(data?: InlineToolData): boolean {
  return data === undefined || Object.keys(data).length === 0;
}

/**
 * Returns a random range within the text
 * @param random - random generator
 * @param length - text length
 */
function randomRange(random: Random, length: number): [number, number] {
  const a = random(length + 1);
  const b = random(length + 1);

  return [Math.min(a, b), Math.max(a, b)];
}

/**
 * Returns a random integer in [0, max)
 */
export type Random = (max: number) => number;

/**
 * Text operation generated for both the implementation under test and the reference model
 */
export type TextOperation = InsertOperation | RemoveOperation | FormatOperation | UnformatOperation;

/**
 * Inserts text at the index
 */
interface InsertOperation {
  type: 'insert';
  text: string;
  index: number;
}

/**
 * Removes text in the range
 */
interface RemoveOperation {
  type: 'remove';
  start: number;
  end: number;
}

/**
 * Applies the tool with optional data to the range
 */
interface FormatOperation {
  type: 'format';
  tool: InlineToolName;
  start: number;
  end: number;
  data?: InlineToolData;
}

/**
 * Removes the tool from the range
 */
interface UnformatOperation {
  type: 'unformat';
  tool: InlineToolName;
  start: number;
  end: number;
}

/**
 * Character of the reference model with the marks applied to it
 */
interface ReferenceChar {
  char: string;
  marks: Map<InlineToolName, InlineToolData | undefined>;
}

/**
 * Straightforward model of formatted text that stores marks per character, used as the oracle
 */
export class ReferenceText {
  /**
   * Characters with their marks
   */
  #chars: ReferenceChar[];

  /**
   * ReferenceText constructor
   * @param text - initial text without formatting
   */
  constructor(text: string) {
    this.#chars = text.split('').map(char => ({
      char,
      marks: new Map(),
    }));
  }

  /**
   * Returns text length
   */
  public get length(): number {
    return this.#chars.length;
  }

  /**
   * Returns the text
   */
  public getText(): string {
    return this.#chars.map(char => char.char).join('');
  }

  /**
   * Applies the operation. Inserted text gets marks of the previous character, or of the first one at index 0
   * @param operation - operation to apply
   */
  public apply(operation: TextOperation): void {
    switch (operation.type) {
      case 'insert': {
        const { index, text } = operation;
        const source = this.#chars[index > 0 ? index - 1 : 0];

        this.#chars.splice(index, 0, ...text.split('').map(char => ({
          char,
          marks: new Map(source?.marks ?? []),
        })));
        break;
      }
      case 'remove':
        this.#chars.splice(operation.start, operation.end - operation.start);
        break;
      case 'format': {
        const data = isEmptyData(operation.data) ? undefined : operation.data;

        this.#chars.slice(operation.start, operation.end).forEach(char => char.marks.set(operation.tool, data));
        break;
      }
      case 'unformat':
        this.#chars.slice(operation.start, operation.end).forEach(char => char.marks.delete(operation.tool));
        break;
    }
  }

  /**
   * Returns maximal fragments sorted by start, then by end descending, then by tool name
   */
  public getFragments(): InlineFragment[] {
    const fragments: InlineFragment[] = [];

    for (const tool of tools) {
      let start = 0;

      while (start < this.#chars.length) {
        if (!this.#chars[start].marks.has(tool)) {
          start++;

          continue;
        }

        const data = this.#chars[start].marks.get(tool);
        let end = start + 1;

        while (end < this.#chars.length && this.#chars[end].marks.has(tool) && isSameInlineData(this.#chars[end].marks.get(tool), data)) {
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
}

/**
 * Returns random data for the tool: one of two hrefs for links, missing or empty data for other tools
 * @param random - random generator
 * @param tool - inline tool
 */
function randomData(random: Random, tool: InlineToolName): InlineToolData | undefined {
  if (tool === tools[2]) {
    return linkData[random(linkData.length)];
  }

  return random(2) === 0 ? undefined : emptyData;
}

/**
 * Compares strings by code units
 * @param a - first string
 * @param b - second string
 */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * Order the model is expected to apply initial fragments in: by start, then by end descending, then by tool, then by data
 * @param a - first fragment
 * @param b - second fragment
 */
export function compareForLoading(a: InlineFragment, b: InlineFragment): number {
  return a.range[0] - b.range[0]
    || b.range[1] - a.range[1]
    || compareStrings(a.tool, b.tool)
    || compareStrings(JSON.stringify(a.data ?? {}), JSON.stringify(b.data ?? {}));
}

/**
 * Returns random fragments for text of the passed length; they may overlap and conflict
 * @param random - random generator
 * @param length - text length
 */
export function randomFragments(random: Random, length: number): InlineFragment[] {
  return Array.from({ length: random(6) }, () => {
    const tool = tools[random(tools.length)];
    const [start, end] = randomRange(random, length);
    const data = randomData(random, tool);
    const fragment: InlineFragment = {
      tool,
      range: [start, end],
    };

    if (data !== undefined) {
      fragment.data = data;
    }

    return fragment;
  });
}

/**
 * Seeded pseudo-random generator (mulberry32), so failures are reproducible
 * @param seed - generator seed
 */
export function createRandom(seed: number): Random {
  let state = seed;

  return (max: number): number => {
    state = (state + 0x6D2B79F5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

/**
 * Returns random initial text of up to 10 characters
 * @param random - random generator
 */
export function randomText(random: Random): string {
  return 'abcdefghij'.slice(0, random(11));
}

/**
 * Returns a random valid operation for text of the passed length
 * @param random - random generator
 * @param length - current text length
 */
export function randomOperation(random: Random, length: number): TextOperation {
  const kind = random(4);

  if (kind === 0) {
    return {
      type: 'insert',
      text: 'xyz'.slice(0, random(3) + 1),
      index: random(length + 1),
    };
  }

  const [start, end] = randomRange(random, length);

  if (kind === 1) {
    return {
      type: 'remove',
      start,
      end,
    };
  }

  const tool = tools[random(tools.length)];

  if (kind === 2) {
    return {
      type: 'format',
      tool,
      start,
      end,
      data: randomData(random, tool),
    };
  }

  return {
    type: 'unformat',
    tool,
    start,
    end,
  };
}

/**
 * Shuffles an array with the passed random generator
 * @param random - random generator
 * @param items - items to shuffle
 */
export function shuffle<T>(random: Random, items: T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const other = random(index + 1);

    [result[index], result[other]] = [result[other], result[index]];
  }

  return result;
}
