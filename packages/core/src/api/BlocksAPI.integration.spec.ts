/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc,@typescript-eslint/naming-convention */
import { jest, beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type { BlocksManager } from '../components/BlockManager';

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
const { CaretAdapter, FormattingAdapter } = await import('@editorjs/dom-adapters');
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

    // @ts-expect-error — mock constructor, no real DOM needed
    const caretAdapter = new CaretAdapter();
    // @ts-expect-error — mock constructor
    const toolsManager = new ToolsManager();
    // @ts-expect-error — mock constructor
    const formattingAdapter = new FormattingAdapter();

    blocksManager = new BlocksManager(
      model,
      eventBus,
      caretAdapter,
      toolsManager,
      formattingAdapter,
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
          { name: 'header',
            data: {} },
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

    it('should emit BlockRemovedEvent on model when delete is called', () => {
      blocksAPI.insert('paragraph');

      const handler = jest.fn();

      model.addEventListener(EventType.Changed, handler);

      blocksAPI.delete(0);

      expect(handler).toHaveBeenCalledWith(expect.any(BlockRemovedEvent));
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
          { name: 'header',
            data: {} },
          { name: 'list',
            data: {} },
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
