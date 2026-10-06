/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { InlineFragment, InlineToolData, InlineToolName } from '@editorjs/model-types';
import {
  createInlineToolData,
  createInlineToolName,
  EventAction,
  EventType,
  TextAddedEvent,
  TextFormattedEvent,
  TextRemovedEvent,
  TextUnformattedEvent
} from '@editorjs/model-types';
import { TextNode } from './index.js';
import { expectRunInvariants } from './runInvariants.testing.js';

const bold = createInlineToolName('bold');
const italic = createInlineToolName('italic');
const link = createInlineToolName('link');

/**
 * Creates an inline fragment
 * @param tool - inline tool name
 * @param start - range start
 * @param end - range end
 * @param [data] - inline tool data
 */
function fragment(tool: InlineToolName, start: number, end: number, data?: InlineToolData): InlineFragment {
  const result: InlineFragment = {
    tool,
    range: [start, end],
  };

  if (data !== undefined) {
    result.data = data;
  }

  return result;
}

/**
 * Creates link data with passed href
 * @param value - link href
 */
function href(value: string): InlineToolData {
  return createInlineToolData({ href: value });
}

/**
 * Nodes created by the current test, checked for run invariants after each test
 */
let createdNodes: TextNode[] = [];

/**
 * Creates a TextNode and tracks it for the run invariants check
 * @param [options] - TextNode constructor options
 */
function createNode(options?: ConstructorParameters<typeof TextNode>[0]): TextNode {
  const node = new TextNode(options);

  createdNodes.push(node);

  return node;
}

describe('TextNode', () => {
  afterEach(() => {
    createdNodes.forEach(node => expectRunInvariants(node));
    createdNodes = [];
  });

  describe('canonical formatting state', () => {
    it('should return the same fragments when equal formatting is applied in a different order', () => {
      const first = createNode({ value: 'abcd' });
      const second = createNode({ value: 'abcd' });

      first.format(bold, 0, 2);
      first.format(italic, 0, 4);
      first.format(bold, 2, 4);

      second.format(bold, 0, 4);
      second.format(italic, 0, 4);

      expect(first.getFragments()).toEqual([fragment(bold, 0, 4), fragment(italic, 0, 4)]);
      expect(second.getFragments()).toEqual(first.getFragments());
    });

    it('should merge fragments split by other formatting', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 0, 3);
      node.format(italic, 1, 3);
      node.format(italic, 3, 6);
      node.format(bold, 3, 5);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 5), fragment(italic, 1, 6)]);
    });

    it('should return a single fragment when a tool is applied over a shorter fragment of another tool', () => {
      const node = createNode({ value: 'abcd' });

      node.format(italic, 1, 3);
      node.format(bold, 0, 4);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 4), fragment(italic, 1, 3)]);
    });

    it('should return the same fragments when constructed with fragments in a different order', () => {
      const fragments = [fragment(bold, 0, 3), fragment(italic, 1, 5)];

      const first = createNode({
        value: 'abcdef',
        fragments,
      });
      const second = createNode({
        value: 'abcdef',
        fragments: [...fragments].reverse(),
      });

      expect(first.getFragments()).toEqual(fragments);
      expect(second.getFragments()).toEqual(fragments);
    });

    it('should restore the previous state when formatting is applied and removed', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 4);
      node.format(italic, 1, 3);
      node.unformat(italic, 1, 3);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 4)]);
    });
  });

  describe('fragment order', () => {
    it('should return a containing fragment before the contained one', () => {
      const node = createNode({ value: 'abcd' });

      node.format(italic, 1, 3);
      node.format(bold, 0, 4);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 4), fragment(italic, 1, 3)]);
    });

    it('should order fragments with equal ranges by tool name', () => {
      const node = createNode({ value: 'abcd' });

      node.format(italic, 0, 4);
      node.format(bold, 0, 4);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 4), fragment(italic, 0, 4)]);
    });

    it('should order fragments by start', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(italic, 4, 6);
      node.format(bold, 0, 2);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 2), fragment(italic, 4, 6)]);
    });
  });

  describe('maximal fragments', () => {
    it('should merge adjacent formatting with equal data', () => {
      const node = createNode({ value: 'abcd' });

      node.format(link, 0, 2, href('a'));
      node.format(link, 2, 4, href('a'));

      expect(node.getFragments()).toEqual([fragment(link, 0, 4, href('a'))]);
    });

    it('should keep adjacent formatting with different data separate', () => {
      const node = createNode({ value: 'abcd' });

      node.format(link, 0, 2, href('a'));
      node.format(link, 2, 4, href('b'));

      expect(node.getFragments()).toEqual([fragment(link, 0, 2, href('a')), fragment(link, 2, 4, href('b'))]);
    });

    it('should join equal fragments when the text between them is removed', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 0, 2);
      node.format(italic, 2, 4);
      node.format(bold, 4, 6);
      node.removeText(2, 4);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 4)]);
    });
  });

  describe('re-applying an inline tool', () => {
    it('should replace data only within the re-applied range', () => {
      const node = createNode({ value: 'abcd' });

      node.format(link, 0, 4, href('a'));
      node.format(link, 1, 3, href('b'));

      expect(node.getFragments()).toEqual([
        fragment(link, 0, 1, href('a')),
        fragment(link, 1, 3, href('b')),
        fragment(link, 3, 4, href('a')),
      ]);
    });

    it('should leave formatting unchanged when re-applied with identical data', () => {
      const node = createNode({ value: 'abcd' });

      node.format(link, 0, 4, href('a'));
      node.format(link, 1, 3, href('a'));

      expect(node.getFragments()).toEqual([fragment(link, 0, 4, href('a'))]);
    });

    it('should dispatch TextFormattedEvent when re-applied with identical data', () => {
      const node = createNode({ value: 'abcd' });
      let event: TextFormattedEvent | null = null;

      node.format(link, 0, 4, href('a'));
      node.addEventListener(EventType.Changed, e => event = e as TextFormattedEvent);
      node.format(link, 1, 3, href('a'));

      expect(event).toBeInstanceOf(TextFormattedEvent);
    });
  });

  describe('fragments in a range', () => {
    it('should return a partially covered fragment whole', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 1, 5);

      expect(node.getFragments(0, 2)).toEqual([fragment(bold, 1, 5)]);
    });

    it('should not return fragments touching the range boundaries', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 0, 2);
      node.format(italic, 4, 6);

      expect(node.getFragments(2, 4)).toEqual([]);
    });

    it('should return no fragments for an empty range', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 4);

      expect(node.getFragments(1, 1)).toEqual([]);
    });

    it('should filter fragments by tool', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 4);
      node.format(italic, 1, 3);

      expect(node.getFragments(0, 4, italic)).toEqual([fragment(italic, 1, 3)]);
    });

    it('should return the whole merged fragment for a range covering one of its parts', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 2);
      node.format(italic, 0, 4);
      node.format(bold, 2, 4);

      expect(node.getFragments(3, 4, bold)).toEqual([fragment(bold, 0, 4)]);
    });

    it('should not expose internal state through returned fragments', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 2);
      node.getFragments()[0].range[1] = 4;

      expect(node.getFragments()).toEqual([fragment(bold, 0, 2)]);
    });
  });

  describe('inserted text formatting', () => {
    it('should extend formatting when text is inserted at the end of a formatted stretch', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 2);
      node.insertText('X', 2);

      expect(node.getText()).toBe('abXcd');
      expect(node.getFragments()).toEqual([fragment(bold, 0, 3)]);
    });

    it('should take formatting of the first character when text is inserted at the start', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 2);
      node.insertText('X', 0);

      expect(node.getText()).toBe('Xabcd');
      expect(node.getFragments()).toEqual([fragment(bold, 0, 3)]);
    });

    it('should not format text inserted after unformatted text', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 2, 4);
      node.insertText('X', 2);

      expect(node.getFragments()).toEqual([fragment(bold, 3, 5)]);
    });

    it('should append text to the end by default', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 2, 4);
      node.insertText('X');

      expect(node.getText()).toBe('abcdX');
      expect(node.getFragments()).toEqual([fragment(bold, 2, 5)]);
    });

    it('should not format text inserted into empty text', () => {
      const node = createNode();

      node.insertText('abc');

      expect(node.getText()).toBe('abc');
      expect(node.length).toBe(3);
      expect(node.getFragments()).toEqual([]);
    });
  });

  describe('text removal', () => {
    it('should return removed text and shrink formatting around it', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 1, 5);

      expect(node.removeText(2, 4)).toBe('cd');
      expect(node.getText()).toBe('abef');
      expect(node.getFragments()).toEqual([fragment(bold, 1, 3)]);
    });

    it('should drop a fragment when all of its text is removed', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 1, 3);
      node.removeText(1, 3);

      expect(node.getText()).toBe('ad');
      expect(node.getFragments()).toEqual([]);
    });

    it('should remove all text by default', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 1, 3);

      expect(node.removeText()).toBe('abcd');
      expect(node.length).toBe(0);
      expect(node.getFragments()).toEqual([]);
    });

    it('should allow inserting text after all text was removed', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 4);
      node.removeText();
      node.insertText('xy');

      expect(node.getText()).toBe('xy');
      expect(node.getFragments()).toEqual([]);
    });
  });

  describe('unformatting', () => {
    it('should remove formatting only within the range', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 0, 6);
      node.unformat(bold, 2, 4);

      expect(node.getFragments()).toEqual([fragment(bold, 0, 2), fragment(bold, 4, 6)]);
    });

    it('should remove formatting when the range is wider than the fragment', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 1, 2);
      node.unformat(bold, 0, 4);

      expect(node.getFragments()).toEqual([]);
    });

    it('should not touch formatting of other tools', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 4);
      node.format(italic, 0, 4);
      node.unformat(bold, 0, 4);

      expect(node.getFragments()).toEqual([fragment(italic, 0, 4)]);
    });
  });

  describe('zero-length ranges', () => {
    it('should not add formatting for an empty range', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 2, 2);

      expect(node.getFragments()).toEqual([]);
    });

    it('should not remove text for an empty range', () => {
      const node = createNode({ value: 'abcd' });

      expect(node.removeText(2, 2)).toBe('');
      expect(node.getText()).toBe('abcd');
    });
  });

  describe('text reading', () => {
    it('should return text from the range across formatting', () => {
      const node = createNode({ value: 'abcdef' });

      node.format(bold, 1, 3);
      node.format(italic, 2, 5);

      expect(node.getText(1, 5)).toBe('bcde');
    });
  });

  describe('validation', () => {
    it('should throw when an index is out of range', () => {
      const node = createNode({ value: 'abc' });

      expect(() => node.removeText(0, 5)).toThrow('Index 5 is not in valid range [0, 3]');
      expect(node.getText()).toBe('abc');
    });

    it('should throw when a negative index is passed', () => {
      const node = createNode({ value: 'abc' });

      expect(() => node.insertText('X', -1)).toThrow('Index -1 is not in valid range [0, 3]');
    });

    it('should throw when the range end is lower than its start', () => {
      const node = createNode({ value: 'abcd' });

      expect(() => node.format(bold, 3, 1)).toThrow('The end of range must be greater or equal than the start: [3, 1]');
    });
  });

  describe('events', () => {
    it('should dispatch TextAddedEvent with the inserted text and range', () => {
      const node = createNode({ value: 'abcd' });
      let event: TextAddedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextAddedEvent);
      node.insertText('X', 2);

      expect(event).toBeInstanceOf(TextAddedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Added,
        index: expect.objectContaining({ textRange: [2, 2] }),
        data: 'X',
      }));
    });

    it('should dispatch TextRemovedEvent with the removed text and range', () => {
      const node = createNode({ value: 'abcd' });
      let event: TextRemovedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextRemovedEvent);
      node.removeText(1, 3);

      expect(event).toBeInstanceOf(TextRemovedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Removed,
        index: expect.objectContaining({ textRange: [1, 3] }),
        data: 'bc',
      }));
    });

    it('should dispatch TextFormattedEvent with the tool, data and range', () => {
      const node = createNode({ value: 'abcd' });
      let event: TextFormattedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextFormattedEvent);
      node.format(link, 1, 3, href('a'));

      expect(event).toBeInstanceOf(TextFormattedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: expect.objectContaining({ textRange: [1, 3] }),
        data: {
          tool: link,
          data: href('a'),
        },
      }));
    });

    it('should dispatch TextUnformattedEvent with the tool and range', () => {
      const node = createNode({ value: 'abcd' });
      let event: TextUnformattedEvent | null = null;

      node.format(bold, 0, 4);
      node.addEventListener(EventType.Changed, e => event = e as TextUnformattedEvent);
      node.unformat(bold, 1, 3);

      expect(event).toBeInstanceOf(TextUnformattedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: expect.objectContaining({ textRange: [1, 3] }),
        data: { tool: bold },
      }));
    });
  });

  describe('.serialized', () => {
    it('should return text value and merged fragments', () => {
      const node = createNode({ value: 'abcd' });

      node.format(bold, 0, 2);
      node.format(italic, 0, 4);
      node.format(bold, 2, 4);

      expect(node.serialized).toEqual(expect.objectContaining({
        value: 'abcd',
        fragments: [fragment(bold, 0, 4), fragment(italic, 0, 4)],
      }));
    });
  });
});
