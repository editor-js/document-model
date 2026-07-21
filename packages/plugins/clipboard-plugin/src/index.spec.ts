/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { CoreConfigValidated, EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';

type Listener = (e: Event) => void;

jest.unstable_mockModule('@editorjs/sdk', () => {
  return {
    CopyUIEventName: 'copy',
    PluginType: { Plugin: 'Plugin' },
    EventBus: jest.fn().mockImplementation(() => {
      const listeners = new Map<string, Listener>();

      return {
        addEventListener: jest.fn((event: string, fn: Listener) => listeners.set(event, fn)),
        removeEventListener: jest.fn((event: string) => listeners.delete(event)),
        __fire: (event: string, evt: Event) => listeners.get(event)?.(evt),
      };
    }),
  };
});

const { EventBus, CopyUIEventName } = await import('@editorjs/sdk');
const { ClipboardPlugin } = await import('./index.js');

type FireableEventBus = InstanceType<typeof EventBus> & { __fire: (event: string, evt: Event) => void };

function createEditorAPIStub(): EditorAPI {
  return { selection: { selectedBlocks: [] as unknown[] } } as unknown as EditorAPI;
}

describe('ClipboardPlugin', () => {
  let pluginParamsMock: EditorjsPluginParams;

  beforeEach(() => {
    pluginParamsMock = {
      eventBus: new EventBus(),
      api: createEditorAPIStub(),
      config: {} as CoreConfigValidated,
    };
  });

  describe('constructor()', () => {
    it('should add CopyUIEvent listener', () => {
      const { eventBus } = pluginParamsMock;

      new ClipboardPlugin(pluginParamsMock);

      expect(eventBus.addEventListener).toHaveBeenCalledWith(`ui:${CopyUIEventName}`, expect.any(Function));
    });
  });

  describe('.destroy()', () => {
    it('should remove CopyUIEvent listener', () => {
      const { eventBus } = pluginParamsMock;
      const cp = new ClipboardPlugin(pluginParamsMock);

      cp.destroy();

      expect(eventBus.removeEventListener).toHaveBeenCalledWith(`ui:${CopyUIEventName}`, expect.any(Function));
    });
  });

  describe('CopyUIEvent listener', () => {
    function dispatchCopyEvent(): { preventDefault: jest.Mock;
      setData: jest.Mock; } {
      const eventBus = pluginParamsMock.eventBus as unknown as FireableEventBus;
      const preventDefault = jest.fn();
      const setData = jest.fn();
      const nativeEvent = { preventDefault,
        clipboardData: { setData } } as unknown as ClipboardEvent;

      eventBus.__fire(`ui:${CopyUIEventName}`, { detail: { nativeEvent } } as unknown as Event);

      return { preventDefault,
        setData };
    }

    function setSelectedBlocks(blocks: unknown[]): void {
      (pluginParamsMock.api.selection as { selectedBlocks: unknown[] }).selectedBlocks = blocks;
    }

    // Stubs the DOM globals the plugin reads at runtime (test env has no jsdom).
    // `rangeContents[i]` is what `getRangeAt(i).cloneContents()` yields for range `i`; the mocked
    // template accumulates whatever gets appended, so the resulting HTML actually reflects how many
    // times (and in what order) the plugin's loop calls `getRangeAt`/`appendChild` — unlike a fixed
    // `innerHTML` stub, this fails if the loop skips, double-runs, or misindexes ranges.
    // Requesting an out-of-bounds index throws, mirroring the real `Selection.getRangeAt` contract.
    // `createElement` is itself a spy so tests can assert whether a template was built at all —
    // useful for the `rangeCount === 0` guard, whose "skip the loop" effect alone can't be observed
    // from the output (an empty loop already produces the same empty HTML as never running one).
    function mockDOMSelection(plainText: string, rangeContents: string[]): { restore: () => void;
      createElement: jest.Mock; } {
      const appended: string[] = [];
      const selection = {
        rangeCount: rangeContents.length,
        toString: () => plainText,
        getRangeAt: (i: number) => {
          if (i < 0 || i >= rangeContents.length) {
            throw new RangeError(`getRangeAt(${i}) is out of range`);
          }

          return { cloneContents: () => rangeContents[i] };
        },
      } as unknown as Selection;
      const template = {
        content: {
          appendChild: (content: unknown): void => {
            appended.push(content as string);
          },
        },
        get innerHTML(): string {
          return appended.join('');
        },
      } as unknown as HTMLTemplateElement;
      const createElement = jest.fn(() => template);

      globalThis.document = { createElement } as unknown as Document;
      globalThis.window = { getSelection: () => selection } as unknown as Window & typeof globalThis;

      return {
        createElement,
        restore: (): void => {
          delete (globalThis as { document?: Document }).document;
          delete (globalThis as { window?: Window }).window;
        },
      };
    }

    describe('when no blocks are selected', () => {
      beforeEach(() => setSelectedBlocks([]));

      it('should not prevent native event', () => {
        new ClipboardPlugin(pluginParamsMock);

        const { preventDefault } = dispatchCopyEvent();

        expect(preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('when blocks are selected', () => {
      let domMocks: ReturnType<typeof mockDOMSelection>;

      beforeEach(() => {
        setSelectedBlocks([
          { id: 'b1',
            type: 'paragraph' },
          { id: 'b2',
            type: 'header' },
        ]);
        domMocks = mockDOMSelection('hello', ['<p>hello</p>']);
      });

      afterEach(() => domMocks.restore());

      it('should add current selection as text to native event', () => {
        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/plain', 'hello');
      });

      it('should add current selection as html to native event', () => {
        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/html', '<p>hello</p>');
      });

      it('should add empty html when the selection has no ranges', () => {
        domMocks = mockDOMSelection('', []);

        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/html', '');
      });

      it('should not build a template when the selection has no ranges', () => {
        domMocks = mockDOMSelection('', []);

        new ClipboardPlugin(pluginParamsMock);

        dispatchCopyEvent();

        expect(domMocks.createElement).not.toHaveBeenCalled();
      });

      it('should include content from every range when the selection spans multiple ranges', () => {
        domMocks = mockDOMSelection('hello world', ['<p>hello</p>', '<p>world</p>']);

        new ClipboardPlugin(pluginParamsMock);

        const { setData } = dispatchCopyEvent();

        expect(setData).toHaveBeenCalledWith('text/html', '<p>hello</p><p>world</p>');
      });

      it('should add custom editorjs data-type to native event', () => {
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

      it('should use core version from api when available', () => {
        const api = pluginParamsMock.api as unknown as { version: string };

        api.version = '3.2.1';

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
            meta: { version: '3.2.1' },
          })
        );
      });

      it('should not prevent native event when clipboardData is unavailable', () => {
        new ClipboardPlugin(pluginParamsMock);

        const eventBus = pluginParamsMock.eventBus as unknown as FireableEventBus;
        const preventDefault = jest.fn();
        const nativeEvent = { preventDefault,
          clipboardData: undefined } as unknown as ClipboardEvent;

        eventBus.__fire(`ui:${CopyUIEventName}`, { detail: { nativeEvent } } as unknown as Event);

        expect(preventDefault).not.toHaveBeenCalled();
      });
    });
  });
});
