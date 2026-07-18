/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { CoreConfigValidated, EditorjsPluginParams } from '@editorjs/sdk';

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

jest.unstable_mockModule('../api', () => ({
  EditorAPI: jest.fn().mockImplementation(() => ({
    selection: { selectedBlocks: [] as unknown[] },
  })),
}));

const { EventBus, CopyUIEventName } = await import('@editorjs/sdk');
const { EditorAPI } = await import('../api');
const { ClipboardPlugin } = await import('./ClipboardPlugin.js');

type FireableEventBus = InstanceType<typeof EventBus> & { __fire: (event: string, evt: Event) => void };

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
    function mockDOMSelection(plainText: string, html: string): () => void {
      const selection = {
        rangeCount: 1,
        toString: () => plainText,
        getRangeAt: () => ({ cloneContents: () => ({}) }),
      } as unknown as Selection;
      const template = { content: { appendChild: (): void => undefined },
        innerHTML: html } as unknown as HTMLTemplateElement;

      globalThis.document = { createElement: () => template } as unknown as Document;
      globalThis.window = { getSelection: () => selection } as unknown as Window & typeof globalThis;

      return (): void => {
        delete (globalThis as { document?: Document }).document;
        delete (globalThis as { window?: Window }).window;
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
      let restoreDOMMocks: () => void;

      beforeEach(() => {
        setSelectedBlocks([
          { id: 'b1',
            type: 'paragraph' },
          { id: 'b2',
            type: 'header' },
        ]);
        restoreDOMMocks = mockDOMSelection('hello', '<p>hello</p>');
      });

      afterEach(() => restoreDOMMocks());

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
    });
  });
});
