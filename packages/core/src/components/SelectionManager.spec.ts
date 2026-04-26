/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc,@typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type { CaretManagerEvents, InlineFragment, InlineToolName, EventType, Index } from '@editorjs/model';

// Register ESM mocks before importing the module under test
jest.unstable_mockModule('@editorjs/model', () => {
  const caretManagerCaretUpdatedEvent = function (
    this: { detail: Record<string, unknown> },
    detail: Record<string, unknown>
  ): void {
    this.detail = detail;
  };

  const eventType: Record<string, string> = {};

  eventType.CaretManagerUpdated = 'caret-updated';

  const EditorJSModel = jest.fn(() => ({
    addEventListener: jest.fn(),
    getFragments: jest.fn(() => []),
    getCaret: jest.fn(() => undefined),
    format: jest.fn(),
    unformat: jest.fn(),
    serialized: { blocks: [] },
  }));

  return {
    EditorJSModel,
    CaretManagerCaretUpdatedEvent: caretManagerCaretUpdatedEvent,
    Index: { parse: jest.fn() },
    EventType: eventType,
    createInlineToolData: (data: Record<string, unknown>) => data,
    createInlineToolName: (name: string) => name,
    FormattingAction: { Format: 'format',
      Unformat: 'unformat' },
  };
});

jest.unstable_mockModule('@editorjs/sdk', () => ({
  CoreEventType: { ToolLoaded: 'tool-loaded' },
  SelectionChangedCoreEvent: jest.fn(function (this: { detail: unknown }, detail: unknown) {
    this.detail = detail;
  }),
  EventBus: jest.fn(() => ({ dispatchEvent: jest.fn() })),
  IndexError: class IndexError extends Error {},
}));

jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    inlineTools: new Map(),
  })),
}));

const { EditorJSModel, EventType, CaretManagerCaretUpdatedEvent, Index } = await import('@editorjs/model');
const { SelectionChangedCoreEvent, EventBus } = await import('@editorjs/sdk');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { SelectionManager } = await import('./SelectionManager.js');

describe('SelectionManager', () => {
  // @ts-expect-error - Mocked instance
  const model = new EditorJSModel();

  let caretEventsListener: (e: CustomEvent) => void;

  model.addEventListener = (type: EventType, callback: (e: Event) => void) => {
    if (type === EventType.CaretManagerUpdated) {
      caretEventsListener = callback;
    }
  };

  const eventBus = new EventBus();

  // @ts-expect-error - Mocked instance
  const toolsManager = new ToolsManager();

  const selectionManager = new SelectionManager(
    { userId: 'user' } as unknown as CoreConfigValidated,
    model,
    eventBus,
    toolsManager
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Caret Events handling', () => {
    it('should ignore caret events of other users', () => {
      const event = new CaretManagerCaretUpdatedEvent({
        userId: 'another-user',
        index: null,
      });

      caretEventsListener(event);

      expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should dispatch empty selection info when index is null', () => {
      const event = new CaretManagerCaretUpdatedEvent({
        userId: 'user',
        index: null,
      });

      caretEventsListener(event);

      expect(model.getFragments).not.toHaveBeenCalled();
      expect(SelectionChangedCoreEvent).toHaveBeenCalledWith(expect.objectContaining({
        index: null,
        fragments: [],
        availableInlineTools: expect.any(Map),
      }));
      expect(eventBus.dispatchEvent).toHaveBeenCalled();
    });

    it('should dispatch selection with empty fragments when parsed index is incomplete', () => {
      const event = new CaretManagerCaretUpdatedEvent({
        userId: 'user',
        index: 'serialized',
      });

      jest.spyOn(Index, 'parse').mockReturnValue({
        blockIndex: 1,
        getTextSegments() {
          return [];
        },
      } as unknown as Index);

      caretEventsListener(event);

      expect(model.getFragments).not.toHaveBeenCalled();
      expect(SelectionChangedCoreEvent).toHaveBeenCalledWith(expect.objectContaining({
        fragments: [],
      }));
    });

    it('should dispatch selection with fragments when parsed index has text range', () => {
      const fragments = [{ tool: 'bold' }] as InlineFragment[];

      jest.spyOn(model, 'getFragments').mockReturnValue(fragments);

      const event = new CaretManagerCaretUpdatedEvent({
        userId: 'user',
        index: 'serialized',
      });

      const segment = {
        blockIndex: 1,
        dataKey: 'text',
        textRange: [1, 3],
      };

      jest.spyOn(Index, 'parse').mockReturnValue({
        ...segment,
        getTextSegments() {
          return [segment];
        },
      } as unknown as Index);

      caretEventsListener(event);

      expect(model.getFragments).toHaveBeenCalledWith(1, 'text', 1, 3);
      expect(SelectionChangedCoreEvent).toHaveBeenCalledWith(expect.objectContaining({
        fragments,
      }));
      expect(eventBus.dispatchEvent).toHaveBeenCalled();
    });

    it('should ignore unknown caret manager event types', () => {
      caretEventsListener({
        detail: {
          userId: 'user',
        },
      } as CaretManagerEvents);

      expect(SelectionChangedCoreEvent).not.toHaveBeenCalled();
      expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should include inline tools from toolsManager in availableInlineTools', () => {
      const toolInstance = { render: jest.fn() };
      const facadeMock = { create: jest.fn(() => toolInstance) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['italic', facadeMock]]);

      const event = new CaretManagerCaretUpdatedEvent({
        userId: 'user',
        index: 'serialized',
      });

      jest.spyOn(model, 'getFragments').mockReturnValue([]);
      jest.spyOn(Index, 'parse').mockReturnValue({
        blockIndex: 1,
        dataKey: 'text',
        textRange: [1, 3],
        getTextSegments() {
          return [{ blockIndex: 1,
            dataKey: 'text',
            textRange: [1, 3] }];
        },
      } as unknown as Index);

      caretEventsListener(event);

      const callArg = (SelectionChangedCoreEvent as jest.MockedClass<typeof SelectionChangedCoreEvent>).mock.calls[0][0] as { availableInlineTools: Map<string, unknown> };

      expect(callArg.availableInlineTools.has('italic')).toBe(true);
    });
  });

  describe('.applyInlineToolForCurrentSelection()', () => {
    it('should throw when caret is not set', () => {
      jest.spyOn(model, 'getCaret').mockReturnValue(undefined);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow();
    });

    it('should throw when caret index is null', () => {
      jest.spyOn(model, 'getCaret').mockReturnValue({ index: null } as unknown as ReturnType<typeof model.getCaret>);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow();
    });

    it('should throw when caret has no text segments', () => {
      const indexMock = { getTextSegments: jest.fn(() => []) };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow();
    });

    it('should throw when tool is not found', () => {
      const indexMock = {
        getTextSegments: jest.fn(() => [{ blockIndex: 0,
          dataKey: 'text',
          textRange: [0, 3] }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);
      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map();

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow('SelectionManager[applyInlineToolForCurrentSelection]: tool bold is not attached');
    });

    it('should call model.format when tool getFormattingOptions returns Format action', () => {
      const mockFormat = jest.spyOn(model, 'format').mockImplementation(() => undefined);
      const toolMock = {
        getFormattingOptions: jest.fn(() => ({ action: 'format',
          range: [0, 3] })),
      };
      const facadeMock = { create: jest.fn(() => toolMock) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['bold', facadeMock]]);

      const indexMock = {
        getTextSegments: jest.fn(() => [{ blockIndex: 0,
          dataKey: 'text',
          textRange: [0, 3] }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);
      jest.spyOn(model, 'getFragments').mockReturnValue([]);

      selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);

      expect(mockFormat).toHaveBeenCalled();
    });

    it('should call model.unformat when tool getFormattingOptions returns Unformat action', () => {
      const mockUnformat = jest.spyOn(model, 'unformat').mockImplementation(() => undefined);
      const toolMock = {
        getFormattingOptions: jest.fn(() => ({ action: 'unformat',
          range: [0, 3] })),
      };
      const facadeMock = { create: jest.fn(() => toolMock) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['bold', facadeMock]]);

      const indexMock = {
        getTextSegments: jest.fn(() => [{ blockIndex: 0,
          dataKey: 'text',
          textRange: [0, 3] }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);
      jest.spyOn(model, 'getFragments').mockReturnValue([]);

      selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);

      expect(mockUnformat).toHaveBeenCalled();
    });

    it('should throw when segment has no textRange', () => {
      const toolMock = { getFormattingOptions: jest.fn() };
      const facadeMock = { create: jest.fn(() => toolMock) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['bold', facadeMock]]);

      const indexMock = {
        getTextSegments: jest.fn(() => [{ blockIndex: 0,
          dataKey: 'text' }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow('TextRange of the index should be defined');
    });

    it('should throw when segment has no blockIndex', () => {
      const toolMock = { getFormattingOptions: jest.fn() };
      const facadeMock = { create: jest.fn(() => toolMock) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['bold', facadeMock]]);

      const indexMock = {
        getTextSegments: jest.fn(() => [{ dataKey: 'text',
          textRange: [0, 3] }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow('BlockIndex should be defined');
    });

    it('should throw when segment has no dataKey', () => {
      const toolMock = { getFormattingOptions: jest.fn() };
      const facadeMock = { create: jest.fn(() => toolMock) };

      (toolsManager as unknown as { inlineTools: Map<unknown, unknown> }).inlineTools = new Map([['bold', facadeMock]]);

      const indexMock = {
        getTextSegments: jest.fn(() => [{ blockIndex: 0,
          textRange: [0, 3] }]),
      };

      jest.spyOn(model, 'getCaret').mockReturnValue({ index: indexMock } as unknown as ReturnType<typeof model.getCaret>);

      expect(() => {
        selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);
      }).toThrow('DataKey of the index should be defined');
    });
  });
});
