import { afterAll, beforeAll, describe, it, expect } from '@jest/globals';
import type { OutputData } from 'editorjs-v2';
import { composeDataFromVersion2 } from './composeDataFromVersion2.js';

/**
 * Plugin name that collides with an Object.prototype member, kept in a constant so the
 * literal doesn't trip the naming-convention lint rule
 */
const PROTO_NAME = '__proto__';

/**
 * Builds v2 output data with a single paragraph block
 * @param block - fields to merge into that block
 */
function v2Data(block: Partial<OutputData['blocks'][number]> = {}): OutputData {
  return {
    blocks: [
      {
        type: 'paragraph',
        data: { text: 'Alpha' },
        ...block,
      },
    ],
  } as OutputData;
}

/**
 * Node type constants as the DOM exposes them, needed by the parser stub below
 */
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Minimal stand-in for what the converter reads off a parsed document
 */
interface ParsedDocumentStub {
  /**
   * Body whose children the converter walks to collect inline fragments
   */
  body: {
    /**
     * Child nodes of the body; the stub yields one text node
     */
    childNodes: unknown[];
  };
}

/**
 * Stubs the DOMParser the converter uses to pull inline fragments out of v2 HTML strings, since
 * this test environment has no jsdom. Only the traversal surface the converter touches is
 * provided: a body of plain text nodes, so a string round-trips as text carrying no fragments.
 * @returns function restoring the previous globals
 */
function mockDOMParser(): () => void {
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalParser = globals.DOMParser;
  const originalNode = globals.Node;

  const parserStub = class {
    /**
     * Wraps the whole string in a single text node
     * @param html - markup the converter hands over
     * @returns document-like object the converter can walk
     */
    public parseFromString(html: string): ParsedDocumentStub {
      return {
        body: {
          childNodes: [{ nodeType: TEXT_NODE,
            textContent: html }],
        },
      };
    }
  };

  globals.DOMParser = parserStub;
  globals.Node = Object.fromEntries([
    ['TEXT_NODE', TEXT_NODE],
    ['ELEMENT_NODE', ELEMENT_NODE],
  ]);

  return () => {
    globals.DOMParser = originalParser;
    globals.Node = originalNode;
  };
}

describe('composeDataFromVersion2', () => {
  let restoreDOMParser: () => void;

  beforeAll(() => {
    restoreDOMParser = mockDOMParser();
  });

  afterAll(() => {
    restoreDOMParser();
  });

  describe('block data', () => {
    it('should convert a string value into a text node', () => {
      const { blocks } = composeDataFromVersion2(v2Data());

      expect(blocks[0].name).toBe('paragraph');
      expect(blocks[0].data).toEqual({
        text: expect.objectContaining({ value: 'Alpha' }),
      });
    });

    it('should keep a non-string value as a serialized value node', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ data: { level: 2 } }));

      expect(blocks[0].data).toEqual({ level: 2 });
    });
  });

  describe('tune data', () => {
    it('should map a tune into plugin data under the same key', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: { anchors: { id: 'intro' } } }));

      expect(blocks[0].plugins).toEqual({ anchors: { id: 'intro' } });
    });

    it('should map several tunes independently', () => {
      const { blocks } = composeDataFromVersion2(v2Data({
        tunes: {
          anchors: { id: 'intro' },
          footnotes: { count: 2 },
        },
      }));

      expect(blocks[0].plugins).toEqual({
        anchors: { id: 'intro' },
        footnotes: { count: 2 },
      });
    });

    it('should store a primitive tune value under the `value` key', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: { alignment: 'left' } }));

      expect(blocks[0].plugins).toEqual({ alignment: { value: 'left' } });
    });

    it('should store an array tune value under the `value` key', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: { list: [1, 2] } }));

      expect(blocks[0].plugins).toEqual({ list: { value: [1, 2] } });
    });

    it('should store a null tune value under the `value` key', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: { maybe: null } }));

      expect(blocks[0].plugins).toEqual({ maybe: { value: null } });
    });

    it('should produce no plugins key for a block without tunes', () => {
      const { blocks } = composeDataFromVersion2(v2Data());

      expect('plugins' in blocks[0]).toBe(false);
    });

    it('should produce no plugins key for an empty tunes map', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: {} }));

      expect('plugins' in blocks[0]).toBe(false);
    });

    it('should keep a tune whose name collides with an object prototype member', () => {
      const { blocks } = composeDataFromVersion2(v2Data({ tunes: { [PROTO_NAME]: { id: 'intro' } } }));

      expect(blocks[0].plugins).toEqual({ [PROTO_NAME]: { id: 'intro' } });
    });
  });
});
