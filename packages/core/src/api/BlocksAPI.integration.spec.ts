/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc,@typescript-eslint/naming-convention */
import { jest, beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type { BlocksManager } from '../components/BlockManager';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type ToolsManager from '../tools/ToolsManager';
import type { TextNodeSerialized } from '@editorjs/model';

const USER_ID = 'integration-user';
const DOCUMENT_ID = 'integration-doc';

/**
 * Mock console.error to suppress expected error logs
 */
console.error = jest.fn();

jest.unstable_mockModule('@editorjs/sdk', () => ({
  BlockAddedCoreEvent: jest.fn(),
  BlockRemovedCoreEvent: jest.fn(),
  EventBus: jest.fn(() => ({
    dispatchEvent: jest.fn(),
  })),
}));

/**
 * Mock DOM adapters — they require a real DOM environment
 */
jest.unstable_mockModule('@editorjs/dom-adapters', () => ({
  BlockToolAdapter: jest.fn(() => ({})),
  CaretAdapter: jest.fn(() => ({
    attachBlock: jest.fn(),
    userCaretIndex: undefined as { blockIndex: number } | undefined,
  })),
  FormattingAdapter: jest.fn(() => ({})),
}));

/**
 * Mock ToolsManager — tools rendering is not part of this integration scope
 */
jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTools: {
      get: jest.fn((name: string) => ({
        name,
        create: jest.fn(() => ({
          render: jest.fn(() => Promise.resolve(document.createElement('div'))),
        })),
      })),
    },
  })),
}));

// Import real model (no mock) and mocked adapters
const { EditorJSModel, EventType, BlockAddedEvent, BlockRemovedEvent } = await import('@editorjs/model');
const { EventBus } = await import('@editorjs/sdk');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlocksManager } = await import('../components/BlockManager.js');
const { BlocksAPI } = await import('./BlocksAPI.js');

describe('BlocksAPI integration (real model, mocked DOM adapters)', () => {
  let model: InstanceType<typeof EditorJSModel>;
  let eventBus: InstanceType<typeof EventBus>;
  let blocksManager: BlocksManager;
  let blocksAPI: InstanceType<typeof BlocksAPI>;

  const config = {
    defaultBlock: 'paragraph',
    userId: USER_ID,
    documentId: DOCUMENT_ID,
    holder: {} as HTMLElement,
  } as CoreConfigValidated;

  beforeEach(() => {
    model = new EditorJSModel(USER_ID, { identifier: DOCUMENT_ID });
    eventBus = new EventBus();

    // @ts-expect-error — mock constructor
    const toolsManager = new ToolsManager();

    blocksManager = new BlocksManager(
      model,
      eventBus,
      toolsManager,
      config
    );

    blocksAPI = new BlocksAPI(blocksManager, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('insert()', () => {
    it('should add a block to an empty document and model.length becomes 1', () => {
      blocksAPI.insert('paragraph', {});

      expect(model.length).toBe(1);
      expect(model.serialized.blocks[0]).toEqual(
        expect.objectContaining({ name: 'paragraph' })
      );
    });

    it('should insert a block at the specified index', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('paragraph');

      blocksAPI.insert('header', { text: 'Title' }, 1);

      expect(model.length).toBe(3);
      expect(model.serialized.blocks[1]).toEqual(
        expect.objectContaining({ name: 'header' })
      );
    });

    it('should use the default block type when type is omitted', () => {
      blocksAPI.insert();

      expect(model.length).toBe(1);
      expect(model.serialized.blocks[0]).toEqual(
        expect.objectContaining({ name: 'paragraph' })
      );
    });

    it('should replace a block at the given index when replace flag is set', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('paragraph');

      blocksAPI.insert('header', {}, 0, undefined, true);

      expect(model.length).toBe(2);
      expect(model.serialized.blocks[0]).toEqual(
        expect.objectContaining({ name: 'header' })
      );
    });
  });

  describe('insertMany()', () => {
    it('should insert multiple blocks at the specified index', () => {
      blocksAPI.insert('paragraph');

      blocksAPI.insertMany(
        [
          {
            name: 'header',
            data: {},
          },
          {
            name: 'image',
            data: {},
          },
        ],
        0
      );

      expect(model.length).toBe(3);
      expect(model.serialized.blocks[0]).toEqual(expect.objectContaining({ name: 'header' }));
      expect(model.serialized.blocks[1]).toEqual(expect.objectContaining({ name: 'image' }));
      expect(model.serialized.blocks[2]).toEqual(expect.objectContaining({ name: 'paragraph' }));
    });

    it('should append blocks at the end when index is omitted', () => {
      blocksAPI.insert('paragraph');

      blocksAPI.insertMany([
        {
          name: 'header',
          data: {},
        },
        {
          name: 'list',
          data: {},
        },
      ]);

      expect(model.length).toBe(3);
      expect(model.serialized.blocks[1]).toEqual(expect.objectContaining({ name: 'header' }));
      expect(model.serialized.blocks[2]).toEqual(expect.objectContaining({ name: 'list' }));
    });
  });

  describe('delete()', () => {
    it('should remove a block at the given index', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('header', {}, 1);
      blocksAPI.insert('list', {}, 2);

      blocksAPI.delete(1);

      expect(model.length).toBe(2);
      expect(model.serialized.blocks[0]).toEqual(expect.objectContaining({ name: 'paragraph' }));
      expect(model.serialized.blocks[1]).toEqual(expect.objectContaining({ name: 'list' }));
    });

    it('should remove the first block when index is 0', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('header', {}, 1);

      blocksAPI.delete(0);

      expect(model.length).toBe(1);
      expect(model.serialized.blocks[0]).toEqual(expect.objectContaining({ name: 'header' }));
    });

    it('should throw when no index is provided and no caret is set', () => {
      blocksAPI.insert('paragraph');

      expect(() => blocksAPI.delete()).toThrow('No block selected to delete');
    });
  });

  describe('move()', () => {
    it('should move a block from fromIndex to toIndex (forward)', () => {
      blocksAPI.insert('a');
      blocksAPI.insert('b', {}, 1);
      blocksAPI.insert('c', {}, 2);

      // Move block 0 ("a") to index 2
      blocksAPI.move(2, 0);

      expect(model.serialized.blocks.map(b => b.name)).toEqual(['b', 'c', 'a']);
    });

    it('should move a block from fromIndex to toIndex (backward)', () => {
      blocksAPI.insert('a');
      blocksAPI.insert('b', {}, 1);
      blocksAPI.insert('c', {}, 2);

      blocksAPI.move(0, 2);

      expect(model.serialized.blocks.map(b => b.name)).toEqual(['c', 'a', 'b']);
    });

    it('should not change anything when fromIndex equals toIndex', () => {
      blocksAPI.insert('a');
      blocksAPI.insert('b', {}, 1);

      blocksAPI.move(0, 0);

      expect(model.serialized.blocks.map(b => b.name)).toEqual(['a', 'b']);
    });

    it('should throw when no fromIndex is provided and no caret is set', () => {
      blocksAPI.insert('paragraph');

      expect(() => blocksAPI.move(0)).toThrow('No block selected to move');
    });
  });

  describe('getBlocksCount()', () => {
    it('should return 0 for an empty document', () => {
      expect(blocksAPI.getBlocksCount()).toBe(0);
    });

    it('should return the correct count after insertions and deletions', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('paragraph');
      blocksAPI.insert('paragraph');

      expect(blocksAPI.getBlocksCount()).toBe(3);

      blocksAPI.delete(0);

      expect(blocksAPI.getBlocksCount()).toBe(2);
    });
  });

  describe('render()', () => {
    it('should replace document content with the provided serialized data', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('paragraph');

      blocksAPI.render({
        identifier: 'new-doc',
        blocks: [
          {
            id: 'mock',
            name: 'header',
            data: {},
          },
        ],
        properties: {},
      });

      expect(model.length).toBe(1);
      expect(model.serialized.blocks[0]).toEqual(expect.objectContaining({ name: 'header' }));
    });

    it('should result in an empty document when empty blocks array is passed', () => {
      blocksAPI.insert('paragraph');

      blocksAPI.render({
        identifier: 'empty-doc',
        blocks: [],
        properties: {},
      });

      expect(model.length).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all blocks from the document', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.insert('header', {}, 1);
      blocksAPI.insert('list', {}, 2);

      blocksAPI.clear();

      expect(model.length).toBe(0);
      expect(model.serialized.blocks).toEqual([]);
    });

    it('should be safe to call on an already empty document', () => {
      blocksAPI.clear();

      expect(model.length).toBe(0);
    });
  });

  describe('model events', () => {
    it('should emit BlockAddedEvent on model when insert is called', () => {
      const handler = jest.fn();

      model.addEventListener(EventType.Changed, handler);

      blocksAPI.insert('paragraph');

      expect(handler).toHaveBeenCalled();

      expect(handler).toHaveBeenCalledWith(expect.any(BlockAddedEvent));
    });

    it('should emit BlockRemovedEvent on model when delete is called', async () => {
      blocksAPI.insert('paragraph');

      const handler = jest.fn();

      model.addEventListener(EventType.Changed, handler);

      blocksAPI.delete(0);

      await Promise.resolve(); // flush queueMicrotask used by removeBlock

      expect(handler).toHaveBeenCalledWith(expect.any(BlockRemovedEvent));
    });
  });

  describe('split()', () => {
    /**
     * Helper to override the blockTools.get mock on the ToolsManager instance.
     * @param getImpl - replacement function for blockTools.get
     */
    function overrideBlockToolsGet(getImpl: (name: string) => unknown): void {
      const results = jest.mocked(ToolsManager).mock.results;
      /**
       * Mock might be created several times, so we need the latest
       */
      const currentToolsManager = results[results.length - 1].value as ToolsManager;

      // @ts-expect-error - override mock implementation
      currentToolsManager.blockTools.get = jest.fn(getImpl);
    }

    it('should split a block when the tool has canSplit = true', () => {
      model.addBlock(USER_ID, {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'Hello World',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'text', 5);

      // Original block remains, a new block is appended after it
      expect(model.length).toBe(2);
    });

    it('should split at the end of a block and insert an empty block when canSplit = true', () => {
      model.addBlock(USER_ID, {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'Hello',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'text', 5);

      expect(model.length).toBe(2);
    });

    it('should use default block and importTextContent when the tool has canSplit = false', () => {
      model.addBlock(USER_ID, {
        name: 'header',
        data: {
          text: {
            $t: 't',
            value: 'Hello World',
            fragments: [],
          },
        },
      }, 0);

      const paragraphTool = {
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn((_value: string, fragments: unknown[]) => ({
          text: {
            $t: 't',
            value: _value,
            fragments,
          },
        })),
        create: jest.fn(),
      };

      overrideBlockToolsGet((name: string) =>
        name === 'header'
          ? {
              name: 'header',
              options: { canSplit: false },
              importTextContent: jest.fn(),
              create: jest.fn(),
            }
          : paragraphTool
      );

      blocksAPI.split(0, 'text', 5);

      expect(model.length).toBe(2);
      expect(model.serialized.blocks[1]).toEqual(
        expect.objectContaining({ name: 'paragraph' })
      );
    });

    it('should throw when the data key is not found in the block', () => {
      model.addBlock(USER_ID, {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'Hello',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      expect(() => blocksAPI.split(0, 'nonexistent', 0)).toThrow(
        'Data key "nonexistent" not found in block content'
      );
    });

    it('canSplit = true: block with two flat inputs — should split first input and move second to new block', () => {
      model.addBlock(USER_ID, {
        name: 'quote',
        data: {
          text: {
            $t: 't',
            value: 'Hello World',
            fragments: [],
          },
          caption: {
            $t: 't',
            value: 'Author Name',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'quote',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'text', 5); // split 'Hello World' at index 5 → 'Hello' | ' World'

      expect(model.length).toBe(2);

      const originalBlock = model.serialized.blocks[0];
      const newBlock = model.serialized.blocks[1];

      // Original block: text truncated; caption removed
      expect(originalBlock.data.text).toEqual(
        expect.objectContaining({ value: 'Hello' })
      );
      expect(originalBlock.data.caption).toBeUndefined();

      // New block carries remainder of text and the full caption
      expect(newBlock.name).toBe('quote');
      expect(newBlock.data.text).toEqual(
        expect.objectContaining({ value: ' World' })
      );
      expect(newBlock.data.caption).toEqual(
        expect.objectContaining({ value: 'Author Name' })
      );
    });

    it('canSplit = true: block with two flat inputs — split at exact end of first input creates new block with only second input', () => {
      model.addBlock(USER_ID, {
        name: 'quote',
        data: {
          text: {
            $t: 't',
            value: 'Hello',
            fragments: [],
          },
          caption: {
            $t: 't',
            value: 'Author',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'quote',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'text', 5); // offset === 'Hello'.length

      expect(model.length).toBe(2);

      const originalBlock = model.serialized.blocks[0];
      const newBlock = model.serialized.blocks[1];

      // Original retains the complete first input; caption is removed
      expect(originalBlock.data.text).toEqual(
        expect.objectContaining({ value: 'Hello' })
      );
      expect(originalBlock.data.caption).toBeUndefined();

      // New block: empty text continuation + full caption
      expect(newBlock.data.text).toEqual(
        expect.objectContaining({ value: '' })
      );
      expect(newBlock.data.caption).toEqual(
        expect.objectContaining({ value: 'Author' })
      );
    });

    it('canSplit = true: block with two flat inputs — split at second (last) input only carries truncation to new block', () => {
      model.addBlock(USER_ID, {
        name: 'quote',
        data: {
          text: {
            $t: 't',
            value: 'Hello',
            fragments: [],
          },
          caption: {
            $t: 't',
            value: 'Caption Text',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'quote',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'caption', 7); // split 'Caption Text' → 'Caption' | ' Text'

      expect(model.length).toBe(2);

      const originalBlock = model.serialized.blocks[0];
      const newBlock = model.serialized.blocks[1];

      // Original: first input untouched, caption truncated to 'Caption'
      expect(originalBlock.data.text).toEqual(
        expect.objectContaining({ value: 'Hello' })
      );
      expect(originalBlock.data.caption).toEqual(
        expect.objectContaining({ value: 'Caption' })
      );

      // New block: only the caption continuation (no text input since it was before the split)
      expect(newBlock.data.caption).toEqual(
        expect.objectContaining({ value: ' Text' })
      );
    });

    it('canSplit = true: block with two flat inputs — split at end of last input inserts empty same-type block', () => {
      model.addBlock(USER_ID, {
        name: 'quote',
        data: {
          text: {
            $t: 't',
            value: 'Hello',
            fragments: [],
          },
          caption: {
            $t: 't',
            value: 'Caption',
            fragments: [],
          },
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'quote',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'caption', 7); // 7 === 'Caption'.length — end of last input

      // Only triggers the "end of last input" early-return when splitIndex === last && offset === length.
      // 'caption' is the second of two inputs (index 1), length is 7 — should add an empty block.
      expect(model.length).toBe(2);
      expect(model.serialized.blocks[1].name).toBe('quote');
    });

    it('canSplit = false: block with two flat inputs — default block receives merged text content', () => {
      model.addBlock(USER_ID, {
        name: 'header',
        data: {
          text: {
            $t: 't',
            value: 'Hello World',
            fragments: [],
          },
          subtitle: {
            $t: 't',
            value: 'Subtitle',
            fragments: [],
          },
        },
      }, 0);

      const paragraphTool = {
        name: 'paragraph',
        options: { canSplit: true },
        // importTextContent receives the merged text and returns block data
        importTextContent: jest.fn((value: string) => ({
          text: {
            $t: 't',
            value,
            fragments: [],
          },
        })),
        create: jest.fn(),
      };

      overrideBlockToolsGet((name: string) =>
        name === 'header'
          ? {
              name: 'header',
              options: { canSplit: false },
              importTextContent: jest.fn(),
              create: jest.fn(),
            }
          : paragraphTool
      );

      blocksAPI.split(0, 'text', 5); // split 'Hello World' → 'Hello' | ' World'

      expect(model.length).toBe(2);

      const newBlock = model.serialized.blocks[1];

      expect(newBlock.name).toBe('paragraph');
      // The merged text = ' World\n' + 'Subtitle\n' (real mergeTextNodes implementation)
      expect(newBlock.data.text).toEqual(
        expect.objectContaining({ value: expect.stringContaining(' World') })
      );
    });
  });

  describe('split() — block data with an array field', () => {
    /**
     * Helper to override the blockTools.get mock on the ToolsManager instance.
     * @param getImpl - replacement function for blockTools.get
     */
    function overrideBlockToolsGet(getImpl: (name: string) => unknown): void {
      const results = jest.mocked(ToolsManager).mock.results;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentToolsManager = results[results.length - 1].value as any;

      (currentToolsManager.blockTools as Record<string, unknown>).get = jest.fn(getImpl);
    }

    it('canSplit = true: single array item — splits text correctly across two blocks', () => {
      // Block has one list item whose text we want to split
      model.addBlock(USER_ID, {
        name: 'list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello World',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'list',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'items.0.text', 5); // 'Hello World' → 'Hello' | ' World'

      expect(model.length).toBe(2);

      // Original block: first item text truncated to 'Hello'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalItems = model.serialized.blocks[0].data.items as any[];

      expect(originalItems[0].text).toEqual(
        expect.objectContaining({ value: 'Hello' })
      );

      // New block: first item text has the remaining ' World'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newItems = model.serialized.blocks[1].data.items as any[];

      expect(newItems[0].text).toEqual(
        expect.objectContaining({ value: ' World' })
      );
    });

    it('canSplit = true: single array item — split at end of text inserts empty same-type block', () => {
      model.addBlock(USER_ID, {
        name: 'list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'list',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'items.0.text', 5); // offset === 'Hello'.length → early-return path

      expect(model.length).toBe(2);
      expect(model.serialized.blocks[1].name).toBe('list');
      // The new block was created with empty data (early-return branch)
      expect(model.serialized.blocks[1].data).toEqual({});
    });

    it('canSplit = true: single array item — split at beginning creates original unchanged and new block with full text', () => {
      model.addBlock(USER_ID, {
        name: 'list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello World',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'list',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'items.0.text', 0); // split at very beginning

      expect(model.length).toBe(2);

      // Original: removeText(userId, 0, 'items.0.text', 0) removes everything → empty
      expect(model.serialized.blocks[0].name).toEqual('list');

      // New block: full original text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((model.serialized.blocks[1].data.items as any[])[0].text).toEqual(
        expect.objectContaining({ value: 'Hello World' })
      );
    });

    it('canSplit = false: two array items — new default block receives merged text from split point onwards', () => {
      // A non-splittable tool (e.g. a heading-like list) whose items text gets
      // merged into the default paragraph block.
      model.addBlock(USER_ID, {
        name: 'fancy-list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello World',
                fragments: [],
              },
            },
            {
              text: {
                $t: 't',
                value: 'Second Item',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      const paragraphTool = {
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn((value: string) => ({
          text: {
            $t: 't',
            value,
            fragments: [],
          },
        })),
        create: jest.fn(),
      };

      overrideBlockToolsGet((name: string) =>
        name === 'fancy-list'
          ? {
              name: 'fancy-list',
              options: { canSplit: false },
              importTextContent: jest.fn(),
              create: jest.fn(),
            }
          : paragraphTool
      );

      // Split 'Hello World' at offset 5 → textAfter = ' World'
      // mergeTextNodes merges (' World\n', 'Second Item\n') → ' World\nSecond Item\n'
      blocksAPI.split(0, 'items.0.text', 5);

      expect(model.length).toBe(2);

      const newBlock = model.serialized.blocks[1];

      expect(newBlock.name).toBe('paragraph');
      // importTextContent was called with the merged string ' World\nSecond Item\n'
      expect(paragraphTool.importTextContent).toHaveBeenCalledWith(
        expect.stringContaining(' World'),
        expect.any(Array)
      );
      expect(newBlock.data.text).toEqual(
        expect.objectContaining({ value: expect.stringContaining(' World') })
      );
    });

    it('canSplit = false: two array items — split at end of first item merges only second item text', () => {
      model.addBlock(USER_ID, {
        name: 'fancy-list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello',
                fragments: [],
              },
            },
            {
              text: {
                $t: 't',
                value: 'Second Item',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      const paragraphTool = {
        name: 'paragraph',
        options: { canSplit: true },
        importTextContent: jest.fn((value: string) => ({
          text: {
            $t: 't',
            value,
            fragments: [],
          },
        })),
        create: jest.fn(),
      };

      overrideBlockToolsGet((name: string) =>
        name === 'fancy-list'
          ? {
              name: 'fancy-list',
              options: { canSplit: false },
              importTextContent: jest.fn(),
              create: jest.fn(),
            }
          : paragraphTool
      );

      // Split at end of first item (offset === 'Hello'.length = 5)
      // textAfter = '' (empty string), mergeTextNodes merges ('\n', 'Second Item\n')
      blocksAPI.split(0, 'items.0.text', 5);

      expect(model.length).toBe(2);
      expect(model.serialized.blocks[1].name).toBe('paragraph');
      // The merged text should include 'Second Item' from the second array element
      expect(paragraphTool.importTextContent).toHaveBeenCalledWith(
        expect.stringContaining('Second Item'),
        expect.any(Array)
      );
    });

    it('canSplit = true: two array items, split at first — documents current behavior (split text overwritten by renumbering)', () => {
      model.addBlock(USER_ID, {
        name: 'list',
        data: {
          items: [
            {
              text: {
                $t: 't',
                value: 'Hello World', // split here at offset 5
                fragments: [],
              },
            },
            {
              text: {
                $t: 't',
                value: 'Second Item',
                fragments: [],
              },
            },
          ],
        },
      }, 0);

      overrideBlockToolsGet(() => ({
        name: 'list',
        options: { canSplit: true },
        importTextContent: jest.fn(),
        create: jest.fn(),
      }));

      blocksAPI.split(0, 'items.0.text', 5);

      // A second block IS created even though the data distribution is imperfect.
      expect(model.length).toBe(2);

      // The original block retains items[0] truncated to 'Hello'.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((model.serialized.blocks[0].data.items as any[])[0].text).toEqual(
        expect.objectContaining({ value: 'Hello' })
      );

      expect(model.serialized.blocks[1].data.items as TextNodeSerialized[]).toEqual([
        { text: { value: ' World',
          fragments: [],
          $t: 't' } },
        { text: { value: 'Second Item',
          fragments: [],
          $t: 't' } },
      ]);
    });
  });

  // ---------- combined operations ----------

  describe('combined operations', () => {
    it('should handle a sequence of insert, move, delete, and clear', () => {
      // Insert 3 blocks: a, b, c
      blocksAPI.insert('a');
      blocksAPI.insert('b', {}, 1);
      blocksAPI.insert('c', {}, 2);
      expect(model.serialized.blocks.map(b => b.name)).toEqual(['a', 'b', 'c']);

      // Move c to front: c, a, b
      blocksAPI.move(0, 2);
      expect(model.serialized.blocks.map(b => b.name)).toEqual(['c', 'a', 'b']);

      // Delete middle block (a): c, b
      blocksAPI.delete(1);
      expect(model.serialized.blocks.map(b => b.name)).toEqual(['c', 'b']);

      // Insert d at index 1: c, d, b
      blocksAPI.insert('d', {}, 1);
      expect(model.serialized.blocks.map(b => b.name)).toEqual(['c', 'd', 'b']);

      // Clear everything
      blocksAPI.clear();
      expect(model.length).toBe(0);
    });

    it('should support render after clear and then further mutations', () => {
      blocksAPI.insert('paragraph');
      blocksAPI.clear();

      blocksAPI.render({
        identifier: 'doc-2',
        blocks: [
          {
            id: 'mock-header',
            name: 'header',
            data: {},
          },
          {
            id: 'mock-list',
            name: 'list',
            data: {},
          },
        ],
        properties: {},
      });

      expect(model.length).toBe(2);

      blocksAPI.delete(0);

      expect(model.length).toBe(1);
      expect(model.serialized.blocks[0]).toEqual(expect.objectContaining({ name: 'list' }));
    });
  });
});
