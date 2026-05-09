/* eslint-disable @stylistic/comma-dangle,@typescript-eslint/naming-convention,@typescript-eslint/no-magic-numbers */
import { beforeEach, jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
import {DataKey} from "@editorjs/model";

const BLOCKS_COUNT = 7;
const USER_ID = 'user';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  EventBus: jest.fn(),
}));

// Register ESM mocks before importing the module under test
jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    serialized: { blocks: [] },
    addEventListener: jest.fn(),
    addBlock: jest.fn(),
    removeBlock: jest.fn(),
    initializeDocument: jest.fn(),
    clearBlocks: jest.fn(),
    getCaret: jest.fn(),
    getBlockSerialized: jest.fn(),
    resolveBlockIndex: jest.fn((i: number) => i),
    getBlockTextContent: jest.fn(),
    removeText: jest.fn(),
    removeDataNode: jest.fn(),
    get length() {
      return BLOCKS_COUNT;
    },
  }));

  const EventBus = jest.fn(() => ({ dispatchEvent: jest.fn() }));

  const EventType = { Changed: 'changed' };

  const keypath = {
    set: jest.fn(),
    get: jest.fn(),
    has: jest.fn(),
    renumberKeys: jest.fn(() => new Map()),
  };

  const sliceFragments = jest.fn((frags: unknown[]) => frags);
  const mergeTextNodes = jest.fn((_entries: unknown[], initial: unknown) => initial);
  const NODE_TYPE_HIDDEN_PROP = '$t';
  const BlockChildType = { Text: 't' };

  return {
    EditorJSModel,
    EventBus,
    EventType,
    keypath,
    sliceFragments,
    mergeTextNodes,
    NODE_TYPE_HIDDEN_PROP,
    BlockChildType,
  };
});

jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTools: {
      get: jest.fn(),
    },
  })),
}));

// Now import the modules (they will receive the mocks registered above)
const { EditorJSModel, EventBus, keypath, mergeTextNodes, sliceFragments } = await import('@editorjs/model');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlocksManager } = await import('./BlockManager.js');

describe('BlocksManager (unit, mocked deps)', () => {
  // @ts-expect-error - mock object, dont need to pass any arguments
  const model = new EditorJSModel();
  const eventBus = new EventBus();
  // @ts-expect-error - Mock instance
  const toolsManager = new ToolsManager();

  const defaultBlock = 'paragraph';

  const blocksManager = new BlocksManager(
    model,
    eventBus,
    toolsManager,
    { defaultBlock,
      userId: USER_ID } as CoreConfigValidated
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('.blocksCount', () => {
    it('should proxy model.length', () => {
      expect(blocksManager.blocksCount).toBe(BLOCKS_COUNT);
    });
  });

  describe('.insert()', () => {
    it('should call model.addBlock with default tool name and computed index', () => {
      blocksManager.insert();

      expect(model.addBlock).toHaveBeenCalledTimes(1);
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          name: 'paragraph'
        }),
        BLOCKS_COUNT
      );
      expect(model.removeBlock).not.toHaveBeenCalled();
    });

    it('should use explicit index when provided', () => {
      blocksManager.insert({
        index: 2,
        type: 'paragraph'
      });

      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          name: 'paragraph'
        }),
        2
      );
    });

    it('should call removeBlock then addBlock when replace is true and index is provided', () => {
      blocksManager.insert({
        type: 'new',
        index: 0,
        replace: true
      });

      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 0);
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          name: 'new'
        }),
        0
      );
    });

    it('should call model.addBlock when focus is true', () => {
      blocksManager.insert({ focus: true });

      expect(model.addBlock).toHaveBeenCalledTimes(1);
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: 'paragraph' }),
        BLOCKS_COUNT
      );
    });

    it('should use model.length as insertion/removal index when replace is true and index is omitted', () => {
      blocksManager.insert({
        replace: true
      });

      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, BLOCKS_COUNT - 1);
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          name: 'paragraph'
        }),
        BLOCKS_COUNT - 1
      );
    });
  });

  describe('.insertMany()', () => {
    it('should call model.addBlock for each block with increasing indexes', () => {
      blocksManager.insertMany([
        {
          name: 'one',
          data: {}
        },
        {
          name: 'two',
          data: {}
        }
      ], 1);

      expect(model.addBlock).toHaveBeenCalledTimes(2);
      expect(model.addBlock).toHaveBeenNthCalledWith(
        1,
        USER_ID,
        {
          name: 'one',
          data: {}
        },
        1
      );
      expect(model.addBlock).toHaveBeenNthCalledWith(
        2,
        USER_ID,
        {
          name: 'two',
          data: {}
        },
        2
      );
    });

    it('should use model.length as start index when index is omitted', () => {
      blocksManager.insertMany([
        {
          name: 'first',
          data: {}
        },
        {
          name: 'second',
          data: {}
        }
      ]);

      expect(model.addBlock).toHaveBeenNthCalledWith(
        1,
        USER_ID,
        {
          name: 'first',
          data: {}
        },
        BLOCKS_COUNT
      );
      expect(model.addBlock).toHaveBeenNthCalledWith(
        2,
        USER_ID,
        {
          name: 'second',
          data: {}
        },
        BLOCKS_COUNT + 1
      );
    });
  });

  describe('.render()', () => {
    it('should call model.initializeDocument with provided document', () => {
      const doc = {
        identifier: 'doc',
        blocks: [
          {
            id: 'mock',
            name: 'x',
            data: {}
          }
        ],
        properties: {}
      };

      blocksManager.render(doc);

      expect(model.initializeDocument).toHaveBeenCalledWith(doc);
    });
  });

  describe('.clear()', () => {
    it('should call model.clearBlocks', () => {
      blocksManager.clear();

      expect(model.clearBlocks).toHaveBeenCalled();
    });
  });

  describe('.deleteBlock()', () => {
    it('should throw when no caret and no index is provided', () => {
      model.getCaret = jest.fn(() => undefined);

      expect(() => blocksManager.deleteBlock()).toThrow('No block selected to delete');
    });

    it('should call model.removeBlock with provided index', () => {
      blocksManager.deleteBlock(0);

      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 0);
    });

    it('should call model.getCaret with the configured userId to resolve current block', () => {
      // @ts-expect-error - mock return value does not need full Caret shape
      model.getCaret = jest.fn(() => ({ index: { blockIndex: 2 } }));

      blocksManager.deleteBlock();

      expect(model.getCaret).toHaveBeenCalledWith(USER_ID);
      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 2);
    });
  });

  describe('.move()', () => {
    it('should call removeBlock and addBlock when moving current block forward', () => {
      // @ts-expect-error - mock return value does not need full Caret shape
      model.getCaret = jest.fn(() => ({ index: { blockIndex: 0 } }));
      // @ts-expect-error - mock return value does not need full BlockNodeSerialized shape
      model.getBlockSerialized = jest.fn(() => ({ name: 'a' }));

      blocksManager.move(2);

      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 0);
      expect(model.addBlock).toHaveBeenCalledWith(USER_ID, { name: 'a' }, 2);
    });

    it('should throw when there is no current block and no index provided', () => {
      model.getCaret = jest.fn(() => undefined);

      expect(() => blocksManager.move(1)).toThrow('No block selected to move');
    });

    it('should pass toIndex directly when toIndex is less than fromIndex', () => {
      // @ts-expect-error - mock return value does not need full BlockNodeSerialized shape
      model.getBlockSerialized = jest.fn(() => ({ name: 'c' }));

      blocksManager.move(0, 2);

      expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 2);
      expect(model.addBlock).toHaveBeenCalledWith(USER_ID, { name: 'c' }, 0);
    });

    it('should do nothing when toIndex equals fromIndex', () => {
      blocksManager.move(1, 1);

      expect(model.removeBlock).not.toHaveBeenCalled();
      expect(model.addBlock).not.toHaveBeenCalled();
    });
  });

  describe('.splitBlock()', () => {
    /**
     * Restore split-specific mock implementations that jest.resetAllMocks() clears.
     */
    beforeEach(() => {
      // @ts-expect-error — jest mock
      keypath.renumberKeys.mockReturnValue(new Map());
      // @ts-expect-error — jest mock
      keypath.set.mockImplementation(() => undefined);
      // @ts-expect-error — jest mock
      mergeTextNodes.mockImplementation((_entries: unknown[], init: unknown) => init);
      // @ts-expect-error — jest mock
      sliceFragments.mockImplementation((frags: unknown[]) => frags);

      model.resolveBlockIndex = jest.fn((i: number | string) => +i);
      model.getBlockSerialized = jest.fn(() => ({
        name: 'paragraph',
        id: 'b1',
        data: {}
      }));
      model.getBlockTextContent = jest.fn(() => ({}));
    });

    it('should throw when the data key is not found in block text content', () => {
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'Hello',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      expect(() => blocksManager.splitBlock(0, 'nonexistent' as DataKey, 0))
        .toThrow('Data key "nonexistent" not found in block content');
    });

    it('canSplit = true: should call removeText with the given offset when splitting in the middle', () => {
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'Hello World',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'text' as DataKey, 5);

      expect(model.removeText).toHaveBeenCalledWith(USER_ID, 0, 'text', 5);
    });

    it('canSplit = true: should NOT call removeText when offset equals input length', () => {
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'Hello',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'text' as DataKey, 5); // 5 === 'Hello'.length

      expect(model.removeText).not.toHaveBeenCalled();
    });

    it('canSplit = true: should call addBlock with the same tool name after splitting', () => {
      model.getBlockSerialized = jest.fn(() => ({
        name: 'header',
        id: 'b1',
        data: {}
      }));
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'Hello World',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'text' as DataKey, 5);

      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: 'header' }),
        1
      );
    });

    it('canSplit = true: should insert empty same-type block when splitting at end of the only input', () => {
      model.getBlockSerialized = jest.fn(() => ({
        name: 'customBlock',
        id: 'b1',
        data: {}
      }));
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'All text',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'text' as DataKey, 8); // 8 === 'All text'.length

      expect(model.removeText).not.toHaveBeenCalled();
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        {
          name: 'customBlock',
          data: {}
        },
        1
      );
    });

    it('canSplit = true: multiple flat inputs — should call removeDataNode for inputs after the split point', () => {
      model.getBlockTextContent = jest.fn(() => ({
        title: {
          value: 'Hello',
          fragments: [],
        },
        caption: {
          value: 'World',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'title' as DataKey, 3);

      expect(model.removeDataNode).toHaveBeenCalledWith(USER_ID, 0, 'caption');
    });

    it('canSplit = true: multiple flat inputs — should set both the split text and subsequent inputs in the new block data', () => {
      const captionContent = {
        value: 'Caption',
        fragments: [],
      };

      model.getBlockTextContent = jest.fn(() => ({
        title: {
          value: 'Hello',
          fragments: [],
        },
        caption: captionContent,
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      // @ts-expect-error — jest mock
      keypath.renumberKeys.mockReturnValue(new Map([['caption', 'caption']]));

      blocksManager.splitBlock(0, 'title' as DataKey, 3);

      // keypath.set should be called for the split input and for each entry after
      expect(keypath.set).toHaveBeenCalledTimes(2);
      expect(keypath.set).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        'title',
        expect.objectContaining({ value: 'lo' }) // 'Hello'.slice(3)
      );
      expect(keypath.set).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        'caption',
        captionContent
      );
    });

    it('canSplit = true: array-indexed inputs — should call renumberKeys with the keys of entries after the split point', () => {
      model.getBlockTextContent = jest.fn(() => ({
        'items.0.text': {
          value: 'Item 0',
          fragments: [],
        },
        'items.1.text': {
          value: 'Item 1',
          fragments: [],
        },
        'items.2.text': {
          value: 'Item 2',
          fragments: [],
        },
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      blocksManager.splitBlock(0, 'items.0.text' as DataKey, 3);

      expect(keypath.renumberKeys).toHaveBeenCalledWith(['items.0.text', 'items.1.text', 'items.2.text']);
    });

    it('canSplit = true: array-indexed inputs — should use renumbered keys when setting subsequent inputs', () => {
      const item1Content = {
        value: 'Item 1',
        fragments: [],
      };
      const item2Content = {
        value: 'Item 2',
        fragments: [],
      };

      model.getBlockTextContent = jest.fn(() => ({
        'items.0.text': {
          value: 'Item 0',
          fragments: [],
        },
        'items.1.text': item1Content,
        'items.2.text': item2Content,
      }));
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn(() => ({ options: { canSplit: true } }));

      // Simulate renumberKeys: items.1 → 0, items.2 → 1
      // @ts-expect-error — jest mock
      keypath.renumberKeys.mockReturnValue(
        new Map([
          ['items.1.text', 'items.0.text'],
          ['items.2.text', 'items.1.text'],
        ])
      );

      blocksManager.splitBlock(0, 'items.0.text' as DataKey, 3);

      expect(keypath.set).toHaveBeenCalledWith(
        expect.any(Object),
        'items.0.text', // renumbered from items.1.text
        item1Content
      );
      expect(keypath.set).toHaveBeenCalledWith(
        expect.any(Object),
        'items.1.text', // renumbered from items.2.text
        item2Content
      );
    });

    it('canSplit = false: should call importTextContent and insert a default block', () => {
      const importMock = jest.fn(() => ({ text: {
        value: 'World',
        fragments: [],
      } }));
      const paragraphTool = {
        options: { canSplit: true },
        importTextContent: importMock,
      };

      model.getBlockSerialized = jest.fn(() => ({
        name: 'header',
        id: 'b1',
        data: {}
      }));
      model.getBlockTextContent = jest.fn(() => ({
        text: {
          value: 'Hello World',
          fragments: [],
        },
      }));
      // @ts-expect-error — jest mock
      mergeTextNodes.mockReturnValue({
        value: ' World\n',
        fragments: []
      });
      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn((name: string) =>
        name === 'paragraph' ? paragraphTool : { options: { canSplit: false } }
      );

      blocksManager.splitBlock(0, 'text' as DataKey, 5);

      expect(importMock).toHaveBeenCalledWith(' World\n', []);
      expect(model.addBlock).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: 'paragraph' }),
        1
      );
    });

    it('canSplit = false: multiple inputs — should pass all entries after split to mergeTextNodes', () => {
      model.getBlockSerialized = jest.fn(() => ({ name: 'header',
        id: 'b1',
        data: {} }));
      model.getBlockTextContent = jest.fn(() => ({
        title: {
          value: 'Hello',
          fragments: [],
        },
        description: {
          value: 'World',
          fragments: [],
        },
      }));
      const importMock = jest.fn(() => ({}));
      const paragraphTool = {
        options: { canSplit: true },
        importTextContent: importMock
      };

      // @ts-expect-error — mock
      toolsManager.blockTools.get = jest.fn((name: string) =>
        name === 'paragraph' ? paragraphTool : { options: { canSplit: false } }
      );

      blocksManager.splitBlock(0, 'title' as DataKey, 3);

      expect(mergeTextNodes).toHaveBeenCalledWith(
        // entriesAfter contains ['description', { value: 'World', ... }]
        expect.arrayContaining([
          expect.arrayContaining(['description']),
        ]),
        // initial accumulator contains text after offset in 'title'
        expect.objectContaining({ value: 'lo\n' }) // 'Hello'.slice(3) + '\n'
      );
    });
  });
});
