/* eslint-disable jsdoc/require-jsdoc, @stylistic/comma-dangle,@typescript-eslint/naming-convention */
import { beforeEach, jest } from '@jest/globals';
import type { BlockToolFacade, EditorJSAdapterPlugin } from '@editorjs/sdk';
import type { BlockId, BlockIndex, Index } from '@editorjs/sdk';

const USER_ID = 'user';

/**
 * Mock console.error to suppress expected error logs
 */
console.error = jest.fn();

jest.unstable_mockModule('@editorjs/sdk', () => ({
  BlockAddedCoreEvent: jest.fn(),
  BlockRemovedCoreEvent: jest.fn(),
  CoreEventType: {
    Undo: 'undo',
    Redo: 'redo'
  },
  EventBus: jest.fn(() => ({ dispatchEvent: jest.fn() })),
  BlockAddedEvent: function (this: { detail: unknown }, index: Index, data: unknown): void {
    this.detail = {
      index,
      data
    };
  },
  BlockRemovedEvent: function (this: { detail: unknown }, index: Index, data: unknown): void {
    this.detail = {
      index,
      data
    };
  },
  EventType: { Changed: 'changed' },
  createBlockId: (str: string) => str,
}));

jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    addEventListener: jest.fn(),
  }));

  return {
    EditorJSModel,
  };
});

jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTools: {
      get: jest.fn(() => ({
        name: 'tool',
        create: jest.fn(() => ({ render: jest.fn(() => Promise.resolve({})) }))
      })),
    },
  })),
}));

// Now import the modules (they will receive the mocks registered above)
const { EditorJSModel } = await import('@editorjs/model');
const { BlockAddedEvent, BlockRemovedEvent, EventBus } = await import('@editorjs/sdk');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlockRenderer } = await import('./BlockRenderer.js');

describe('BlockRenderer (unit, mocked deps)', () => {
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
  const toolsManager = new ToolsManager();

  const adapter: EditorJSAdapterPlugin = {
    createBlockToolAdapter: jest.fn(() => ({})),
    destroyBlockToolAdapter: jest.fn(),
  } as unknown as EditorJSAdapterPlugin;

  new BlockRenderer(
    model,
    eventBus,
    toolsManager,
    adapter
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('#handleModelUpdate()', () => {
    it('should ignore unknown model events', () => {
      void changedListener({ type: 'unknown-event' });

      expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
    });

    describe('BlockAddedEvent handling', () => {
      it('should create tool and dispatch BlockAddedCoreEvent via EventBus', async () => {
        const createMock = jest.fn(() => ({ render: jest.fn(() => Promise.resolve({})) }));

        jest.spyOn(toolsManager.blockTools, 'get').mockReturnValue({
          name: 'tool',
          create: createMock
        } as unknown as BlockToolFacade);

        const event = new BlockAddedEvent(
          { blockIndex: 0 } as unknown as BlockIndex,
          {
            name: 'tool',
            id: 'test-block-id' as BlockId,
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

      it('should throw when blockIndex is undefined', async () => {
        const event = new BlockAddedEvent(
          {} as unknown as BlockIndex,
          {
            name: 'tool',
            id: 'test-block-id' as BlockId,
            data: {}
          },
          USER_ID,
        );

        try {
          await changedListener(event);
        } catch (error: unknown) {
          expect((error as Error).message).toContain('[BlockRenderer] Block index should be defined');
        }
      });

      it('should throw when tool is not found', async () => {
        jest.spyOn(toolsManager.blockTools, 'get').mockReturnValue(undefined);

        const event = new BlockAddedEvent(
          { blockIndex: 0 } as unknown as BlockIndex,
          {
            name: 'missing-tool',
            id: 'test-block-id' as BlockId,
            data: {}
          },
          USER_ID,
        );

        try {
          await changedListener(event);
        } catch (error: unknown) {
          expect((error as Error).message).toContain('[BlockRenderer] Block Tool missing-tool not found');
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
          { blockIndex: 0 } as unknown as BlockIndex,
          {
            name: 'tool',
            id: 'test-block-id' as BlockId,
            data: {}
          },
          USER_ID,
        );

        await changedListener(event);

        expect(errorSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[BlockRenderer] Block Tool tool failed to render'),
          expect.any(Error)
        );
        errorSpy.mockRestore();
      });
    });

    describe('BlockRemovedEvent handling', () => {
      it('should dispatch BlockRemovedCoreEvent via EventBus', () => {
        const event = new BlockRemovedEvent(
          { blockIndex: 1 } as unknown as BlockIndex,
          {
            name: 'tool',
            id: 'test-block-id' as BlockId,
            data: {}
          },
          USER_ID,
        );

        void changedListener(event);

        expect(eventBus.dispatchEvent).toHaveBeenCalled();
      });

      it('should call destroyBlockToolAdapter with the block id', () => {
        const blockId = 'test-block-id' as unknown as BlockId;
        const event = new BlockRemovedEvent(
          { blockIndex: 1 } as unknown as BlockIndex,
          {
            name: 'tool',
            id: blockId,
            data: {}
          },
          USER_ID,
        );

        void changedListener(event);

        expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledWith(blockId);
      });

      it('should throw when blockIndex is undefined', () => {
        const event = new BlockRemovedEvent(
          {} as unknown as BlockIndex,
          {
            name: 'tool',
            id: 'test-block-id' as BlockId,
            data: {}
          },
          USER_ID,
        );

        expect(() => {
          void changedListener(event);
        }).toThrow('Block index should be defined');
      });
    });
  });
});

describe('BlockRenderer lifecycle', () => {
  interface Setup {
    renderer: InstanceType<typeof BlockRenderer>;
    emit: (event: unknown) => Promise<void>;
    signal: () => AbortSignal | undefined;
    dispatchEvent: jest.Mock;
    adapter: { createBlockToolAdapter: jest.Mock;
      destroyBlockToolAdapter: jest.Mock; };
  }

  /**
   * Creates a renderer whose model honours the abort signal, like a real EventTarget
   * @param createTool - returns the tool instance for each added block
   */
  function setup(createTool: () => { render: () => Promise<unknown>;
    destroy?: () => void; }): Setup {
    let listener: ((event: unknown) => void | Promise<void>) | undefined;
    let listenerSignal: AbortSignal | undefined;

    const model = {
      addEventListener: jest.fn((_type: string, callback: (event: unknown) => void, options?: AddEventListenerOptions) => {
        listener = callback;
        listenerSignal = options?.signal;
      }),
    };
    const dispatchEvent = jest.fn();
    const adapter = {
      createBlockToolAdapter: jest.fn(() => ({})),
      destroyBlockToolAdapter: jest.fn(),
    };
    const toolsManager = {
      blockTools: {
        get: jest.fn(() => ({
          name: 'tool',
          create: createTool,
        })),
      },
    };

    const renderer = new BlockRenderer(
      model as unknown as InstanceType<typeof EditorJSModel>,
      { dispatchEvent } as unknown as InstanceType<typeof EventBus>,
      toolsManager as unknown as InstanceType<typeof ToolsManager>,
      adapter as unknown as EditorJSAdapterPlugin
    );

    return {
      renderer,
      emit: async (event: unknown) => {
        if (listenerSignal?.aborted === true) {
          return;
        }

        await listener?.(event);
      },
      signal: () => listenerSignal,
      dispatchEvent,
      adapter,
    };
  }

  const added = (id: string, blockIndex = 0): unknown => new BlockAddedEvent(
    { blockIndex } as unknown as BlockIndex,
    { name: 'tool',
      id: id as BlockId,
      data: {} },
    USER_ID
  );

  const removed = (id: string, blockIndex = 0): unknown => new BlockRemovedEvent(
    { blockIndex } as unknown as BlockIndex,
    { name: 'tool',
      id: id as BlockId,
      data: {} },
    USER_ID
  );

  it('should call tool destroy when its block is removed', async () => {
    const destroy = jest.fn();
    const { emit, adapter, dispatchEvent } = setup(() => ({ render: () => Promise.resolve({}),
      destroy }));

    await emit(added('a'));
    await emit(removed('a'));

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledWith('a');
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it('should destroy every remaining tool and block adapter on destroy without dispatching BlockRemovedCoreEvent', async () => {
    const destroy = jest.fn();
    const { renderer, emit, adapter, dispatchEvent } = setup(() => ({ render: () => Promise.resolve({}),
      destroy }));

    await emit(added('a', 0));
    await emit(added('b', 1));
    dispatchEvent.mockClear();

    renderer.destroy();

    expect(destroy).toHaveBeenCalledTimes(2);
    expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledWith('a');
    expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledWith('b');
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('should not destroy a removed block again on destroy', async () => {
    const destroy = jest.fn();
    const { renderer, emit } = setup(() => ({ render: () => Promise.resolve({}),
      destroy }));

    await emit(added('a'));
    await emit(removed('a'));
    renderer.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should stop handling model events after destroy', async () => {
    const { renderer, emit, signal, dispatchEvent } = setup(() => ({ render: () => Promise.resolve({}) }));

    renderer.destroy();
    await emit(added('a'));

    expect(signal()?.aborted).toBe(true);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('should not dispatch BlockAddedCoreEvent for a render that settles after destroy', async () => {
    let resolveRender: (value: unknown) => void = () => undefined;
    const destroy = jest.fn();
    const { renderer, emit, adapter, dispatchEvent } = setup(() => ({
      render: () => new Promise((resolve) => {
        resolveRender = resolve;
      }),
      destroy,
    }));

    const pending = emit(added('a'));

    renderer.destroy();
    resolveRender({});
    await pending;

    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledWith('a');
  });

  it('should keep tearing down when a tool destroy throws', async () => {
    let calls = 0;
    const { renderer, emit, adapter } = setup(() => ({
      render: () => Promise.resolve({}),
      destroy: () => {
        calls++;
        throw new Error('broken tool');
      },
    }));

    await emit(added('a', 0));
    await emit(added('b', 1));

    expect(() => renderer.destroy()).not.toThrow();
    expect(calls).toBe(2);
    expect(adapter.destroyBlockToolAdapter).toHaveBeenCalledTimes(2);
  });
});
