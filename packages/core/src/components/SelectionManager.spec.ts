/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @stylistic/comma-dangle,@typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { CoreConfig, ToolLoadedCoreEvent } from '@editorjs/sdk';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type { CaretManagerEvents, InlineFragment, InlineToolName, EventType, Index } from '@editorjs/model';

// Register ESM mocks before importing the module under test
jest.unstable_mockModule('@editorjs/dom-adapters', () => ({
  FormattingAdapter: jest.fn(() => ({
    attachTool: jest.fn(),
    applyFormat: jest.fn(),
  })),
}));

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
    serialized: { blocks: [] },
  }));

  return {
    EditorJSModel,
    CaretManagerCaretUpdatedEvent: caretManagerCaretUpdatedEvent,
    Index: { parse: jest.fn() },
    EventType: eventType,
    createInlineToolData: (data: Record<string, unknown>) => data,
    createInlineToolName: (name: string) => name,
  };
});

jest.unstable_mockModule('@editorjs/sdk', () => ({
  CoreEventType: { ToolLoaded: 'tool-loaded' },
  SelectionChangedCoreEvent: jest.fn(function (this: { detail: unknown }, detail: unknown) {
    this.detail = detail;
  }),
  EventBus: jest.fn(() => ({ dispatchEvent: jest.fn() })),
}));

const { EditorJSModel, EventType, CaretManagerCaretUpdatedEvent, Index } = await import('@editorjs/model');
const { SelectionChangedCoreEvent, CoreEventType, EventBus } = await import('@editorjs/sdk');
const { FormattingAdapter } = await import('@editorjs/dom-adapters');
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

  // @ts-expect-error - Mocked instance
  const formattingAdapter = new FormattingAdapter();
  const eventBus = new EventBus();

  let toolLoadedListener: (e: CustomEvent) => void;

  eventBus.addEventListener = (type: string, callback: (e: Event) => void) => {
    if (type === `core:${CoreEventType.ToolLoaded}`) {
      toolLoadedListener = callback;
    }
  };

  const selectionManager = new SelectionManager({ userId: 'user' } as CoreConfig, model, formattingAdapter, eventBus);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('tool registration (ToolLoaded event)', () => {
    it('should ignore non-inline loaded tool', () => {
      const tool = {
        name: 'paragraph',
        isInline: jest.fn(() => false),
        create: jest.fn(),
      };

      toolLoadedListener({
        detail: { tool },
      } as unknown as ToolLoadedCoreEvent);

      expect(formattingAdapter.attachTool).not.toHaveBeenCalled();
    });

    it('should register inline tool and attach it to formatting adapter', () => {
      const inlineToolInstance = { render: jest.fn() };
      const tool = {
        name: 'bold',
        isInline: jest.fn(() => true),
        create: jest.fn(() => inlineToolInstance),
      };

      toolLoadedListener({
        detail: { tool },
      } as unknown as ToolLoadedCoreEvent);

      expect(tool.create).toHaveBeenCalled();
      expect(formattingAdapter.attachTool).toHaveBeenCalledWith('bold', inlineToolInstance);
    });
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
      }
      );

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

    it('should keep loaded inline tools map in selection changed payload', () => {
      const tool = {
        name: 'italic',
        isInline: jest.fn(() => true),
        create: jest.fn(() => ({ render: jest.fn() })),
      };

      toolLoadedListener({
        detail: { tool },
      } as unknown as ToolLoadedCoreEvent);

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
          return [
            {
              blockIndex: 1,
              dataKey: 'text',
              textRange: [1, 3],
            },
          ];
        },
      } as unknown as Index);

      caretEventsListener(event);

      expect(SelectionChangedCoreEvent).toHaveBeenCalledWith(expect.objectContaining({
        availableInlineTools: new Map([['italic', jest.fn()]])
      }));
    });
  });

  describe('.applyInlineToolForCurrentSelection()', () => {
    it('should apply inline tool format with default data', () => {
      selectionManager.applyInlineToolForCurrentSelection('bold' as InlineToolName);

      expect(formattingAdapter.applyFormat).toHaveBeenCalledWith('bold', {});
    });

    it('should apply inline tool format with provided data', () => {
      selectionManager.applyInlineToolForCurrentSelection('link' as InlineToolName, { href: 'https://example.com' });

      expect(formattingAdapter.applyFormat).toHaveBeenCalledWith('link', { href: 'https://example.com' },);
    });
  });
});
