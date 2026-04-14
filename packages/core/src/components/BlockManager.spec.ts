/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @stylistic/comma-dangle */
import { beforeEach, jest } from '@jest/globals';
import type { BlockToolFacade, CoreConfigValidated } from '@editorjs/sdk';
import type { Index } from '@editorjs/model';

const BLOCKS_COUNT = 7;
const USER_ID = 'user';

// Register ESM mocks before importing the module under test
jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    serialized: { blocks: [] },
    addEventListener: jest.fn(),
    addBlock: jest.fn(),
    removeBlock: jest.fn(),
    initializeDocument: jest.fn(),
    clearBlocks: jest.fn(),
    get length() {
      return BLOCKS_COUNT;
    },
  }));

  const EventBus = jest.fn(() => ({ dispatchEvent: jest.fn() }));

  const BlockAddedEvent = function (this: { detail: unknown }, index: Index, data: unknown): void {
    this.detail = {
      index,
      data
    };
  };

  const BlockRemovedEvent = function (this: { detail: unknown }, index: Index, data: unknown): void {
    this.detail = {
      index,
      data
    };
  };

  const EventType = { Changed: 'changed' };

  return {
    EditorJSModel,
    EventBus,
    BlockAddedEvent,
    BlockRemovedEvent,
    EventType,
  };
});

jest.unstable_mockModule('@editorjs/dom-adapters', () => ({
  BlockToolAdapter: jest.fn(() => ({})),
  CaretAdapter: jest.fn(() => ({
    attachBlock: jest.fn(),
  })),
  FormattingAdapter: jest.fn(() => ({})),
}));

jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTools: {
      get: jest.fn(() => ({ name: 'tool',
        create: jest.fn(() => ({ render: jest.fn(() => Promise.resolve({})) })) })),
    },
  })),
}));

// Now import the modules (they will receive the mocks registered above)
const { EditorJSModel, EventBus, BlockAddedEvent, BlockRemovedEvent } = await import('@editorjs/model');
const { CaretAdapter, FormattingAdapter } = await import('@editorjs/dom-adapters');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlocksManager } = await import('./BlockManager.js');

describe('BlocksManager (unit, mocked deps)', () => {
  // @ts-expect-error - mock object, dont need to pass any arguments
  const model = new EditorJSModel();
  let changedListener: (event: unknown) => void | Promise<void> = () => undefined;

  // capture model change listener so tests can invoke it
  model.addEventListener = jest.fn((type: string, callback: (event: unknown) => void) => {
    if (type === 'changed') {
      changedListener = callback;
    }
  });

  const eventBus = new EventBus();
  // @ts-expect-error - Mock instance
  const caretAdapter = new CaretAdapter();
  // @ts-expect-error - Mock instance
  const toolsManager = new ToolsManager();
  // @ts-expect-error - Mock instance
  const formattingAdapter = new FormattingAdapter();

  const defaultBlock = 'paragraph';

  const blocksManager = new BlocksManager(
    model,
    eventBus,
    caretAdapter,
    toolsManager,
    formattingAdapter,
    { defaultBlock,
      userId: USER_ID } as CoreConfigValidated
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('insert should call model.addBlock with default tool name and computed index', () => {
    blocksManager.insert();

    expect(model.addBlock).toHaveBeenCalledTimes(1);
    expect(model.addBlock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        name: 'paragraph'
      }),
      BLOCKS_COUNT + 1
    );
    expect(model.removeBlock).not.toHaveBeenCalled();
  });

  it('insert with explicit index should not use default computed index path', () => {
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

  it('blocksCount should proxy model.length', () => {
    expect(blocksManager.blocksCount).toBe(BLOCKS_COUNT);
  });

  it('insert with replace should call removeBlock then addBlock with provided index', () => {
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

  it('insert with replace and without index should use model.length as insertion/removal index', () => {
    blocksManager.insert({
      replace: true
    });

    expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, BLOCKS_COUNT);
    expect(model.addBlock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        name: 'paragraph'
      }),
      BLOCKS_COUNT
    );
  });

  it('insertMany should call model.addBlock for each block with increasing indexes', () => {
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

  it('insertMany without index should use default model.length + 1 as start index', () => {
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
      BLOCKS_COUNT + 1
    );
    expect(model.addBlock).toHaveBeenNthCalledWith(
      2,
      USER_ID,
      {
        name: 'second',
        data: {}
      },
      BLOCKS_COUNT + 2
    );
  });

  it('render should call model.initializeDocument with provided document', () => {
    const doc = {
      identifier: 'doc',
      blocks: [
        {
          name: 'x',
          data: {}
        }
      ],
      properties: {}
    };

    blocksManager.render(doc);

    expect(model.initializeDocument).toHaveBeenCalledWith(doc);
  });

  it('clear should call model.clearBlocks', () => {
    blocksManager.clear();

    expect(model.clearBlocks).toHaveBeenCalled();
  });

  it('deleteBlock without caret and without index should throw', () => {
    expect(() => blocksManager.deleteBlock()).toThrow('No block selected to delete');
  });

  it('deleteBlock with index should call model.removeBlock with index', () => {
    blocksManager.deleteBlock(0);

    expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 0);
  });

  it('move should call removeBlock and addBlock with adjusted index when moving current block', () => {
    // @ts-expect-error - need to assign read only property to mock it
    model.serialized = {
      blocks: [
        {
          name: 'a'
        },
        {
          name: 'b'
        },
        {
          name: 'c'
        }
      ]
    };
    // @ts-expect-error - need to assign read only property to mock it
    caretAdapter.userCaretIndex = {
      blockIndex: 0
    };

    blocksManager.move(2);

    expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 0);
    expect(model.addBlock).toHaveBeenCalledWith(
      USER_ID,
      {
        name: 'a'
      },
      3
    );
  });

  it('move should throw when there is no current block', () => {
    // @ts-expect-error - need to assign read only property to mock it
    caretAdapter.userCaretIndex = undefined;

    expect(() => blocksManager.move(1)).toThrow('No block selected to move');
  });

  it('move should not offset target index when toIndex is less than fromIndex', () => {
    // @ts-expect-error - need to assign read only property to mock it
    model.serialized = {
      blocks: [
        {
          name: 'a'
        },
        {
          name: 'b'
        },
        {
          name: 'c'
        }
      ]
    };

    blocksManager.move(0, 2);

    expect(model.removeBlock).toHaveBeenCalledWith(USER_ID, 2);
    expect(model.addBlock).toHaveBeenCalledWith(USER_ID, { name: 'c' }, 0);
  });

  it('move should do nothing when toIndex equals fromIndex', () => {
    // @ts-expect-error - need to assign read only property to mock it
    model.serialized = {
      blocks: [
        {
          name: 'a'
        },
        {
          name: 'b'
        },
        {
          name: 'c'
        }
      ]
    };

    blocksManager.move(1, 1);

    expect(model.removeBlock).not.toHaveBeenCalled();
    expect(model.addBlock).not.toHaveBeenCalled();
  });

  it('should ignore unknown model events in #handleModelUpdate default branch', () => {
    void changedListener({
      type: 'unknown-event'
    });

    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should handle BlockAddedEvent and dispatch BlockAddedCoreEvent via EventBus', async () => {
    const createMock = jest.fn(() => ({ render: jest.fn() }));

    jest.spyOn(toolsManager.blockTools, 'get').mockReturnValue({
      name: 'tool',
      create: createMock
    } as unknown as BlockToolFacade);

    const event = new BlockAddedEvent(
      {
        blockIndex: 0
      } as Index,
      {
        name: 'tool',
        data: {}
      },
      USER_ID,
    );

    await changedListener(event);

    expect(toolsManager.blockTools.get).toHaveBeenCalledWith('tool');
    expect(createMock).toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      readOnly: false
    }));
    expect(eventBus.dispatchEvent).toHaveBeenCalled();
  });

  it('should handle BlockRemovedEvent and dispatch BlockRemovedCoreEvent via EventBus', () => {
    const event = new BlockRemovedEvent(
      {
        blockIndex: 1
      } as Index,
      {
        name: 'tool',
        data: {}
      },
      USER_ID,
    );

    void changedListener(event);

    expect(eventBus.dispatchEvent).toHaveBeenCalled();
  });

  it('should surface missing block index via unhandledRejection event for BlockAddedEvent', async () => {
    const event = new BlockAddedEvent(
      {} as Index,
      {
        name: 'tool',
        data: {}
      },
      USER_ID,
    );

    const eventPromise = changedListener(event);

    try {
      await eventPromise;
    } catch (error: unknown) {
      expect((error as Error).message).toContain('[BlockManager] Block index should be defined');
    }
  });

  it('should surface missing tool via unhandledRejection event for BlockAddedEvent', async () => {
    jest.spyOn(toolsManager.blockTools, 'get').mockReturnValue(undefined);

    const event = new BlockAddedEvent(
      {
        blockIndex: 0
      } as Index,
      {
        name: 'missing-tool',
        data: {}
      },
      USER_ID,
    );

    try {
      await changedListener(event);
    } catch (error: unknown) {
      expect((error as Error).message).toContain('[BlockManager] Block Tool missing-tool not found');
    }
  });

  it('should log error when tool render fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const createMock = jest.fn(() => ({
      render: jest.fn(() => Promise.reject(new Error('render failed')))
    }));

    jest.spyOn(toolsManager.blockTools, 'get').mockReturnValue({
      name: 'tool',
      create: createMock
    } as unknown as BlockToolFacade);

    const event = new BlockAddedEvent(
      {
        blockIndex: 0
      } as Index,
      {
        name: 'tool',
        data: {}
      },
      USER_ID,
    );

    await changedListener(event);

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BlockManager] Block Tool tool failed to render'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should throw on BlockRemovedEvent when blockIndex is undefined', () => {
    const event = new BlockRemovedEvent(
      {} as Index,
      {
        name: 'tool',
        data: {}
      },
      USER_ID,
    );

    expect(() => {
      void changedListener(event);
    }).toThrow('Block index should be defined');
  });
});
