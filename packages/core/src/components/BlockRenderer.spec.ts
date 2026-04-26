/* eslint-disable jsdoc/require-jsdoc, @stylistic/comma-dangle,@typescript-eslint/naming-convention */
import { beforeEach, jest } from '@jest/globals';
import type { BlockToolFacade, EditorJSAdapterPlugin } from '@editorjs/sdk';
import type { Index } from '@editorjs/model';

const USER_ID = 'user';

/**
 * Mock console.error to suppress expected error logs
 */
console.error = jest.fn();

jest.unstable_mockModule('@editorjs/sdk', () => ({
  BlockAddedCoreEvent: jest.fn(),
  BlockRemovedCoreEvent: jest.fn(),
  EventBus: jest.fn(),
}));

jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    addEventListener: jest.fn(),
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
const { EditorJSModel, EventBus, BlockAddedEvent, BlockRemovedEvent } = await import('@editorjs/model');
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
          { blockIndex: 0 } as Index,
          { name: 'tool',
            data: {} },
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
          {} as Index,
          { name: 'tool',
            data: {} },
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
          { blockIndex: 0 } as Index,
          { name: 'missing-tool',
            data: {} },
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
          { blockIndex: 0 } as Index,
          { name: 'tool',
            data: {} },
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
          { blockIndex: 1 } as Index,
          { name: 'tool',
            data: {} },
          USER_ID,
        );

        void changedListener(event);

        expect(eventBus.dispatchEvent).toHaveBeenCalled();
      });

      it('should throw when blockIndex is undefined', () => {
        const event = new BlockRemovedEvent(
          {} as Index,
          { name: 'tool',
            data: {} },
          USER_ID,
        );

        expect(() => {
          void changedListener(event);
        }).toThrow('Block index should be defined');
      });
    });
  });
});
