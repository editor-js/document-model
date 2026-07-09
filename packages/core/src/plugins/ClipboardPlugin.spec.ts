/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import { ClipboardPlugin } from './ClipboardPlugin';
import type { CoreConfigValidated, EditorjsPluginParams } from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { CopyUIEventName } from '@editorjs/sdk';
import { EditorAPI } from '../api';

jest.mock('@editorjs/sdk', () => {
  const originalModule = jest.requireActual('@editorjs/sdk');

  return {
    // @ts-expect-error - jest.requireActual returns object
    ...originalModule,
    EventBus: jest.fn().mockImplementation(() => {
      const listeners = new Map<string, EventListener>();

      return {
        addEventListener: jest.fn((event: string, fn: EventListener) => {
          listeners.set(event, fn);
        }),
        removeEventListener: jest.fn((event: string) => {
          listeners.delete(event);
        }),
        /**
         * Test helper: dispatch a previously-registered event
         * @param event - event name to fire
         * @param evt - event payload
         */
        __fire: (event: string, evt: Event) => listeners.get(event)?.(evt),
      };
    }),
  };
});

jest.mock('../api', () => {
  return {
    EditorAPI: jest.fn().mockImplementation(() => ({
      selection: {
        selectedBlocks: [] as unknown[],
      },
    })),
  };
});

describe('ClipboardPlugin', () => {
  let pluginParamsMock: EditorjsPluginParams;

  beforeEach(() => {
    pluginParamsMock = {
      eventBus: new EventBus(),
      api: new EditorAPI(),
      config: {} as CoreConfigValidated,
    };
  });

  describe('constructor()', () => {
    it('should add CopyUIEvent listener', () => {
      const { eventBus } = pluginParamsMock;

      new ClipboardPlugin(pluginParamsMock);

      expect(eventBus.addEventListener).toHaveBeenCalled();
    });
  });

  describe('.destroy()', () => {
    it('should remove CopyUIEvent listener', () => {
      const { eventBus } = pluginParamsMock;
      const cp = new ClipboardPlugin(pluginParamsMock);

      cp.destroy();

      expect(eventBus.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('CopyUIEvent listener', () => {
    /**
     * Shape of `document` exposed to the plugin under test.
     */
    interface DocumentStub {
      /**
       * Creates a fake element; only `'template'` is exercised by the plugin.
       */
      createElement: (tag: string) => unknown;
    }

    /**
     * Shape of `window` exposed to the plugin under test.
     */
    interface WindowStub {
      /**
       * Returns a fake `Selection` matching the `MockDOMSelectionOptions` shape.
       */
      getSelection: () => unknown;
    }

    /**
     * `globalThis` augmented with the DOM globals the plugin reads at runtime.
     * Used to stub `window.getSelection` / `document.createElement` under the
     * `node` Jest test environment.
     */
    interface GlobalThisWithDOM {
      /**
       * `document` global; only present under DOM-capable test environments.
       */
      document?: DocumentStub;
      /**
       * `window` global; only present under DOM-capable test environments.
       */
      window?: WindowStub;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    type FireableEventBus = EventBus & { __fire: (event: string, evt: Event) => void };

    /**
     * Spies returned by `dispatchCopyEvent` for assertions on the native event.
     */
    interface DispatchedEventSpies {
      /**
       * Spy on the native event's `preventDefault` method.
       */
      preventDefault: jest.Mock;
      /**
       * Spy on the native event's `clipboardData.setData` method.
       */
      setData: jest.Mock;
    }

    /**
     * Builds a stub `CopyUIEvent`-shaped object with a `preventDefault` spy and a
     * `clipboardData.setData` spy, then dispatches it through the EventBus mock.
     * @returns spies for `preventDefault` and `clipboardData.setData`
     */
    function dispatchCopyEvent(): DispatchedEventSpies {
      const eventBus = pluginParamsMock.eventBus as unknown as FireableEventBus;
      const preventDefault = jest.fn();
      const setData = jest.fn();

      const nativeEvent = {
        preventDefault,
        clipboardData: { setData },
      } as unknown as ClipboardEvent;
      const uiEvent = { detail: { nativeEvent } } as unknown as Event;

      eventBus.__fire(`ui:${CopyUIEventName}`, uiEvent);

      return {
        preventDefault,
        setData,
      };
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    function setSelectedBlocks(blocks: unknown[]): void {
      const { api } = pluginParamsMock;

      // eslint-disable-next-line jsdoc/require-jsdoc
      (api.selection as { selectedBlocks: unknown[] }).selectedBlocks = blocks;
    }

    /**
     * Describes a stubbed DOM selection for the duration of a single test.
     */
    interface MockDOMSelectionOptions {
      /**
       * Value returned by `selection.toString()`.
       */
      plainText: string;
      /**
       * Inner HTML of the resulting `HTMLTemplateElement`.
       */
      html: string;
      /**
       * Number of ranges in the selection. Defaults to `1`.
       */
      rangeCount?: number;
    }

    /**
     * Stubs the DOM globals (`window.getSelection`, `document.createElement`) so the
     * plugin's DOM-dependent code paths can be exercised under the `node` test env.
     * Returns a `restore` callback to undo the mocks in `afterEach`.
     * @param options - plain text and HTML the selection should expose
     * @returns restore function that reinstates the original globals
     */
    function mockDOMSelection(options: MockDOMSelectionOptions): () => void {
      const { plainText, html, rangeCount = 1 } = options;

      const cloneContents = jest.fn(() => ({}));
      const range = { cloneContents };
      const selection = {
        rangeCount,
        toString: jest.fn(() => plainText),
        getRangeAt: jest.fn(() => range),
      };
      const templateContent = {
        appendChild: jest.fn(),
      };
      const template = {
        content: templateContent,
        get innerHTML(): string {
          return html;
        },
      };
      const documentStub = {
        createElement: jest.fn((tag: string) => {
          if (tag === 'template') {
            return template;
          }

          return undefined;
        }),
      };
      const windowStub = {
        getSelection: jest.fn(() => selection),
      };
      const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, 'document');
      const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
      const g = globalThis as GlobalThisWithDOM;
      const originalDocument = g.document;
      const originalWindow = g.window;

      g.document = documentStub;
      g.window = windowStub;

      return (): void => {
        if (hadDocument) {
          g.document = originalDocument;
        } else {
          delete g.document;
        }
        if (hadWindow) {
          g.window = originalWindow;
        } else {
          delete g.window;
        }
      };
    }

    describe('when no blocks are selected', () => {
      beforeEach(() => {
        setSelectedBlocks([]);
      });

      it('should not prevent native event', () => {
        new ClipboardPlugin(pluginParamsMock);

        const { preventDefault } = dispatchCopyEvent();

        expect(preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('when blocks are selected', () => {
      let restoreDOMMocks: () => void;

      beforeEach(() => {
        setSelectedBlocks([
          { id: 'b1',
            type: 'paragraph' },
          { id: 'b2',
            type: 'header' },
        ]);
      });

      afterEach(() => {
        if (restoreDOMMocks !== undefined) {
          restoreDOMMocks();
          restoreDOMMocks = (): void => undefined;
        }
      });

      it('should add current selection as text to native event', () => {
        restoreDOMMocks = mockDOMSelection({ plainText: 'hello',
          html: '<p>hello</p>' });

        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/plain', 'hello');
      });

      it('should add current selection as html to native event', () => {
        restoreDOMMocks = mockDOMSelection({ plainText: 'hello',
          html: '<p>hello</p>' });

        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/html', '<p>hello</p>');
      });

      it('should add custom editorjs data-type to native event', () => {
        restoreDOMMocks = mockDOMSelection({ plainText: 'hello',
          html: '<p>hello</p>' });

        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith(
          'application/x-editor-js',
          JSON.stringify({
            blocks: [
              { id: 'b1',
                type: 'paragraph' },
              { id: 'b2',
                type: 'header' },
            ],
            meta: { version: '3.0.0' },
          })
        );
      });
    });
  });
});
