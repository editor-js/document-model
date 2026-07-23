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

/**
 * Minimal Core stand-in recording `use()` calls and delegating `initialize()`.
 */
class MockCore {
  public use = use;
  public initialize = initialize;
}

jest.unstable_mockModule('@editorjs/core', () => ({ default: MockCore }));
jest.unstable_mockModule('@editorjs/dom-adapters', () => ({ DOMAdapters: class DOMAdapters {} }));
jest.unstable_mockModule('@editorjs/collaboration-manager', () => ({ CollaborationManager: class CollaborationManager {} }));
jest.unstable_mockModule('@editorjs/paragraph', () => ({ Paragraph: class Paragraph {} }));
jest.unstable_mockModule('@editorjs/bold', () => ({ BoldInlineTool: class BoldInlineTool {} }));
jest.unstable_mockModule('@editorjs/italic', () => ({ ItalicInlineTool: class ItalicInlineTool {} }));
jest.unstable_mockModule('@editorjs/inline-link', () => ({ LinkInlineTool: class LinkInlineTool {} }));
jest.unstable_mockModule('@editorjs/clipboard-plugin', () => ({ ClipboardPlugin: class ClipboardPlugin {} }));
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
  });

  it('exposes isReady that resolves when Core initialization completes', async () => {
    initialize.mockResolvedValue(undefined);

    const editor = new EditorJS({} as any);

    await expect(editor.isReady).resolves.toBeUndefined();
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('rejects isReady when Core initialization fails', async () => {
    initialize.mockRejectedValue(new Error('init failed'));

    const editor = new EditorJS({} as any);

    await expect(editor.isReady).rejects.toThrow('init failed');
  });

  it('registers a rendering adapter on the underlying Core', () => {
    initialize.mockResolvedValue(undefined);

    void new EditorJS({} as any);

    const registered = use.mock.calls.map(([ctor]) => (ctor as { name: string }).name);

    expect(registered).toContain('DOMAdapters');
  });
});
