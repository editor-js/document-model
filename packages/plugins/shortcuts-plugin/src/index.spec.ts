/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { CoreConfigValidated, EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';

type Listener = (e: Event) => void;

/**
 * `matchKeyboardShortcut` is mocked so tests drive matching explicitly rather than
 * simulating real key codes. Its behavior is validated in `@editorjs/sdk`.
 */
const matchKeyboardShortcut = jest.fn<(event: KeyboardEvent, shortcut: string) => boolean>();

class IndexError extends Error {}

jest.unstable_mockModule('@editorjs/sdk', () => {
  return {
    CoreEventType: { ToolLoaded: 'tool:loaded' },
    KeydownUIEventName: 'key-down',
    PluginType: { Plugin: 'Plugin' },
    IndexError,
    matchKeyboardShortcut,
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

const { EventBus, CoreEventType, KeydownUIEventName } = await import('@editorjs/sdk');
const { ShortcutsPlugin } = await import('./index.js');

type FireableEventBus = InstanceType<typeof EventBus> & { __fire: (event: string, evt: Event) => void };

const TOOL_LOADED_EVENT = `core:${CoreEventType.ToolLoaded}`;
const KEYDOWN_EVENT = `ui:${KeydownUIEventName}`;

describe('ShortcutsPlugin', () => {
  let pluginParamsMock: EditorjsPluginParams;
  let applyInlineTool: jest.Mock;

  beforeEach(() => {
    matchKeyboardShortcut.mockReset();

    applyInlineTool = jest.fn();
    pluginParamsMock = {
      eventBus: new EventBus(),
      api: { selection: { applyInlineTool } } as unknown as EditorAPI,
      config: {} as CoreConfigValidated,
    };
  });

  function bus(): FireableEventBus {
    return pluginParamsMock.eventBus as unknown as FireableEventBus;
  }

  /**
   * Emits a `core:tool:loaded` event carrying a tool facade with the given name and options.
   * @param name - tool name reported by the facade
   * @param options - merged tool options (e.g. `{ shortcut: 'CMD+B' }`)
   */
  function loadTool(name: string, options: Record<string, unknown>): void {
    bus().__fire(TOOL_LOADED_EVENT, { detail: { tool: { name,
      options } } } as unknown as Event);
  }

  /**
   * Emits a `ui:key-down` event and returns the native event's `preventDefault` spy.
   * @param nativeEvent - partial native keydown event overrides
   */
  function pressKey(nativeEvent: Partial<KeyboardEvent> = {}): jest.Mock {
    const preventDefault = jest.fn();

    bus().__fire(KEYDOWN_EVENT, { detail: { nativeEvent: { preventDefault,
      isComposing: false,
      ...nativeEvent } } } as unknown as Event);

    return preventDefault;
  }

  describe('constructor()', () => {
    it('should add tool-loaded listener', () => {
      new ShortcutsPlugin(pluginParamsMock);

      expect(pluginParamsMock.eventBus.addEventListener).toHaveBeenCalledWith(TOOL_LOADED_EVENT, expect.any(Function));
    });

    it('should add keydown listener', () => {
      new ShortcutsPlugin(pluginParamsMock);

      expect(pluginParamsMock.eventBus.addEventListener).toHaveBeenCalledWith(KEYDOWN_EVENT, expect.any(Function));
    });
  });

  describe('tool-loaded listener', () => {
    it('should register a shortcut when the tool options provide a string shortcut', () => {
      new ShortcutsPlugin(pluginParamsMock);
      loadTool('bold', { shortcut: 'CMD+B' });
      matchKeyboardShortcut.mockReturnValue(true);

      pressKey();

      expect(matchKeyboardShortcut).toHaveBeenCalledWith(expect.anything(), 'CMD+B');
      expect(applyInlineTool).toHaveBeenCalledWith({ tool: 'bold' });
    });

    it('should ignore a tool whose shortcut option is not a string', () => {
      new ShortcutsPlugin(pluginParamsMock);
      loadTool('bold', { shortcut: 123 });
      matchKeyboardShortcut.mockReturnValue(true);

      pressKey();

      expect(matchKeyboardShortcut).not.toHaveBeenCalled();
      expect(applyInlineTool).not.toHaveBeenCalled();
    });

    it('should ignore a tool with no shortcut option', () => {
      new ShortcutsPlugin(pluginParamsMock);
      loadTool('paragraph', {});
      matchKeyboardShortcut.mockReturnValue(true);

      pressKey();

      expect(matchKeyboardShortcut).not.toHaveBeenCalled();
      expect(applyInlineTool).not.toHaveBeenCalled();
    });
  });

  describe('keydown listener', () => {
    beforeEach(() => {
      new ShortcutsPlugin(pluginParamsMock);
      loadTool('bold', { shortcut: 'CMD+B' });
    });

    it('should apply the inline tool and prevent default when a shortcut matches', () => {
      matchKeyboardShortcut.mockReturnValue(true);

      const preventDefault = pressKey();

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(applyInlineTool).toHaveBeenCalledWith({ tool: 'bold' });
    });

    it('should do nothing when no shortcut matches', () => {
      matchKeyboardShortcut.mockReturnValue(false);

      const preventDefault = pressKey();

      expect(preventDefault).not.toHaveBeenCalled();
      expect(applyInlineTool).not.toHaveBeenCalled();
    });

    it('should ignore the event while IME composition is in progress', () => {
      matchKeyboardShortcut.mockReturnValue(true);

      const preventDefault = pressKey({ isComposing: true });

      expect(matchKeyboardShortcut).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
      expect(applyInlineTool).not.toHaveBeenCalled();
    });

    it('should apply only the first matching shortcut', () => {
      loadTool('italic', { shortcut: 'CMD+I' });
      matchKeyboardShortcut.mockReturnValue(true);

      pressKey();

      expect(applyInlineTool).toHaveBeenCalledTimes(1);
      expect(applyInlineTool).toHaveBeenCalledWith({ tool: 'bold' });
    });

    it('should swallow an IndexError thrown while applying the inline tool', () => {
      matchKeyboardShortcut.mockReturnValue(true);
      applyInlineTool.mockImplementation(() => {
        throw new IndexError('no caret');
      });

      expect(() => pressKey()).not.toThrow();
    });

    it('should rethrow a non-IndexError thrown while applying the inline tool', () => {
      matchKeyboardShortcut.mockReturnValue(true);
      applyInlineTool.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => pressKey()).toThrow('boom');
    });
  });

  describe('.destroy()', () => {
    it('should clear registered shortcuts so later keydowns dispatch nothing', () => {
      const plugin = new ShortcutsPlugin(pluginParamsMock);

      loadTool('bold', { shortcut: 'CMD+B' });
      plugin.destroy();
      matchKeyboardShortcut.mockReturnValue(true);

      pressKey();

      expect(applyInlineTool).not.toHaveBeenCalled();
    });
  });
});
