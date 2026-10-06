/* eslint-disable @typescript-eslint/naming-convention -- mock module factories mirror PascalCase class exports */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- config shape is irrelevant while Core is mocked */
/* eslint-disable jsdoc/require-jsdoc -- inline test helpers */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Shared mocks for the underlying Core so we can observe composition and control
 * how initialization settles without touching the DOM.
 */
const use = jest.fn();
const initialize = jest.fn<() => Promise<void>>();
const destroy = jest.fn();

/**
 * Minimal Core stand-in recording `use()` calls and delegating `initialize()`.
 */
class MockCore {
  public use = use;
  public initialize = initialize;
  public destroy = destroy;
}

jest.unstable_mockModule('@editorjs/core', () => ({ default: MockCore }));
jest.unstable_mockModule('@editorjs/dom-adapters', () => ({ DOMAdapters: class DOMAdapters {} }));
jest.unstable_mockModule('@editorjs/collaboration-manager', () => ({ CollaborationManager: class CollaborationManager {} }));
jest.unstable_mockModule('@editorjs/paragraph', () => ({ Paragraph: class Paragraph {} }));
jest.unstable_mockModule('@editorjs/bold', () => ({ BoldInlineTool: class BoldInlineTool {} }));
jest.unstable_mockModule('@editorjs/italic', () => ({ ItalicInlineTool: class ItalicInlineTool {} }));
jest.unstable_mockModule('@editorjs/inline-link', () => ({ LinkInlineTool: class LinkInlineTool {} }));
jest.unstable_mockModule('@editorjs/clipboard-plugin', () => ({ ClipboardPlugin: class ClipboardPlugin {} }));
jest.unstable_mockModule('@editorjs/shortcuts-plugin', () => ({ ShortcutsPlugin: class ShortcutsPlugin {} }));
jest.unstable_mockModule('@editorjs/ui', () => ({
  EditorjsUI: class EditorjsUI {},
  BlocksUI: class BlocksUI {},
  InlineToolbarUI: class InlineToolbarUI {},
  ToolbarUI: class ToolbarUI {},
  ToolboxUI: class ToolboxUI {},
}));
const { default: EditorJS } = await import('./index.js');

describe('EditorJS bundle', () => {
  beforeEach(() => {
    use.mockClear();
    initialize.mockReset();
    destroy.mockClear();
  });

  describe('isReady interrupted by destroy', () => {
    /**
     * Lets an unhandled rejection surface: Jest fails the test that leaves one behind
     */
    const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

    it('should not leave an AbortError from isReady unhandled', async () => {
      initialize.mockRejectedValue(new DOMException('Editor was destroyed during initialization', 'AbortError'));

      void new EditorJS({} as any);

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should still reject isReady with the AbortError', async () => {
      initialize.mockRejectedValue(new DOMException('Editor was destroyed during initialization', 'AbortError'));

      const editor = new EditorJS({} as any);

      await expect(editor.isReady).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  it('should delegate destroy to Core', () => {
    initialize.mockResolvedValue(undefined);

    const editor = new EditorJS({} as any);

    editor.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('exposes isReady that resolves when Core initialization completes', async () => {
    initialize.mockResolvedValue(undefined);

    const editor = new EditorJS({} as any);

    await expect(editor.isReady).resolves.toBeUndefined();
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('rejects isReady when Core initialization fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    initialize.mockRejectedValue(new Error('init failed'));

    const editor = new EditorJS({} as any);

    await expect(editor.isReady).rejects.toThrow('init failed');
    expect(error).toHaveBeenCalledWith('[EditorJS] Initialization failed', expect.any(Error));

    error.mockRestore();
  });

  it('registers a rendering adapter on the underlying Core', () => {
    initialize.mockResolvedValue(undefined);

    void new EditorJS({} as any);

    const registered = use.mock.calls.map(([ctor]) => (ctor as { name: string }).name);

    expect(registered).toContain('DOMAdapters');
  });

  it('registers the default plugins on the underlying Core', () => {
    initialize.mockResolvedValue(undefined);

    void new EditorJS({} as any);

    const registered = use.mock.calls.map(([ctor]) => (ctor as { name: string }).name);

    expect(registered).toContain('ClipboardPlugin');
    expect(registered).toContain('ShortcutsPlugin');
  });
});
