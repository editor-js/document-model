import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EditorAPI, EditorjsPluginParams, ToolLoadedCoreEvent } from '@editorjs/sdk';
import { CoreEventBase, CoreEventType, EventBus, KeydownUIEventName, UIEventBase } from '@editorjs/sdk';
import { ShortcutsPlugin } from './ShortcutsPlugin.js';

const applyInlineTool = jest.fn();

/**
 * Editor API stub exposing only what the plugin touches
 */
const api = {
  selection: { applyInlineTool },
} as unknown as EditorAPI;

/**
 * Builds a tool facade stub whose `pluginOptions` answers for the shortcuts plugin only
 * @param name - identifier the plugin applies the inline tool by
 * @param shortcut - shortcut declared under `options.plugins.shortcuts`
 * @param legacyShortcut - shortcut declared under the removed flat `options.shortcut` key
 */
function createToolFacade(
  name: string,
  shortcut: string | undefined,
  legacyShortcut?: string
): ToolLoadedCoreEvent['detail']['tool'] {
  return {
    name,
    options: legacyShortcut === undefined ? {} : { shortcut: legacyShortcut },
    pluginOptions: (id: string) => (id === 'shortcuts' && shortcut !== undefined ? { shortcut } : undefined),
  } as unknown as ToolLoadedCoreEvent['detail']['tool'];
}

/**
 * Dispatches a keydown UI event carrying a stub native event.
 * The test environment is `node`, which has no `KeyboardEvent`, so only the fields the
 * shortcut matcher reads are provided.
 * @param eventBus - bus the plugin listens on
 * @param init - native keyboard event properties
 */
function pressKey(eventBus: EventBus, init: Partial<KeyboardEvent>): void {
  const nativeEvent = {
    code: '',
    key: '',
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    repeat: false,
    isComposing: false,
    preventDefault: jest.fn(),
    ...init,
  } as unknown as KeyboardEvent;

  eventBus.dispatchEvent(
    new UIEventBase(KeydownUIEventName, { nativeEvent }) as unknown as Event
  );
}

describe('ShortcutsPlugin', () => {
  let eventBus: EventBus;
  let plugin: ShortcutsPlugin;

  beforeEach(() => {
    applyInlineTool.mockReset();
    eventBus = new EventBus();
    plugin = new ShortcutsPlugin({
      api,
      eventBus,
      config: {},
    } as unknown as EditorjsPluginParams);
  });

  describe('tool-declared shortcuts', () => {
    it('should apply the inline tool declared under options.plugins.shortcuts', () => {
      eventBus.dispatchEvent(new CoreEventBase(CoreEventType.ToolLoaded, {
        tool: createToolFacade('bold', 'CMD+B'),
      }) as unknown as Event);

      pressKey(eventBus, { code: 'KeyB',
        metaKey: true });

      expect(applyInlineTool).toHaveBeenCalledWith({ tool: 'bold' });
    });

    it('should ignore a shortcut declared under the legacy flat options.shortcut key', () => {
      eventBus.dispatchEvent(new CoreEventBase(CoreEventType.ToolLoaded, {
        tool: createToolFacade('bold', undefined, 'CMD+B'),
      }) as unknown as Event);

      pressKey(eventBus, { code: 'KeyB',
        metaKey: true });

      expect(applyInlineTool).not.toHaveBeenCalled();
    });
  });

  describe('public API', () => {
    it('should invoke a handler registered through the public API', () => {
      const handler = jest.fn();

      plugin.publicApi.register('CMD+K', handler);

      pressKey(eventBus, { code: 'KeyK',
        metaKey: true });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should stop invoking a handler after it is unregistered', () => {
      const handler = jest.fn();

      plugin.publicApi.register('CMD+K', handler);
      plugin.publicApi.unregister('CMD+K');

      pressKey(eventBus, { code: 'KeyK',
        metaKey: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should replace the previous handler when the same shortcut is registered again', () => {
      const first = jest.fn();
      const second = jest.fn();

      plugin.publicApi.register('CMD+K', first);
      plugin.publicApi.register('CMD+K', second);

      pressKey(eventBus, { code: 'KeyK',
        metaKey: true });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('should stop invoking handlers after the plugin is destroyed', () => {
      const handler = jest.fn();

      plugin.publicApi.register('CMD+K', handler);
      plugin.destroy();

      pressKey(eventBus, { code: 'KeyK',
        metaKey: true });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
