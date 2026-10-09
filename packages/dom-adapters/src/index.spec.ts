import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import type { BlockId, EditorAPI, EditorjsPluginParams, EventBus } from '@editorjs/sdk';

jest.unstable_mockModule('@editorjs/dom', () => ({
  isNativeInput: jest.fn(() => false),
}));

const { DOMAdapters } = await import('./index.js');
const { DOMBlockToolAdapter } = await import('./BlockToolAdapter/index.js');
const { CaretAdapter } = await import('./CaretAdapter/index.js');
const { FormattingAdapter } = await import('./FormattingAdapter/index.js');
const { InputsRegistry } = await import('./InputsRegistry/index.js');

/**
 * Stand-in for `document`, where the shared selection watcher adds its listener
 */
Object.assign(globalThis, {
  document: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

/**
 * Creates the plugin with stub API members the adapters subscribe through
 */
function createPlugin(): { plugin: InstanceType<typeof DOMAdapters>;
  eventBus: EventTarget; } {
  const eventBus = new EventTarget();
  const api = {
    selection: {
      createCaret: jest.fn(() => ({ index: null })),
      onCaretUpdate: jest.fn(() => jest.fn()),
    },
    document: {
      onUpdate: jest.fn(() => jest.fn()),
    },
  } as unknown as EditorAPI;

  const plugin = new DOMAdapters({
    config: { holder: {} as HTMLElement,
      userId: 'user' },
    api,
    eventBus: eventBus as EventBus,
  } as unknown as EditorjsPluginParams);

  return { plugin,
    eventBus };
}

describe('DOMAdapters', () => {
  it('should destroy every remaining block adapter on destroy', () => {
    const destroy = jest.spyOn(DOMBlockToolAdapter.prototype, 'destroy');
    const { plugin } = createPlugin();

    plugin.createBlockToolAdapter('a' as BlockId, 'paragraph');
    plugin.createBlockToolAdapter('b' as BlockId, 'paragraph');
    destroy.mockClear();

    plugin.destroy();

    expect(destroy).toHaveBeenCalledTimes(2);

    destroy.mockRestore();
  });

  it('should leave the inputs registry empty after destroy', () => {
    const removeBlock = jest.spyOn(InputsRegistry.prototype, 'removeBlock');
    const { plugin } = createPlugin();

    plugin.createBlockToolAdapter('a' as BlockId, 'paragraph');
    plugin.createBlockToolAdapter('b' as BlockId, 'paragraph');

    plugin.destroy();

    expect(removeBlock).toHaveBeenCalledWith('a');
    expect(removeBlock).toHaveBeenCalledWith('b');

    removeBlock.mockRestore();
  });

  it('should not destroy a block adapter already destroyed with its block', () => {
    const destroy = jest.spyOn(DOMBlockToolAdapter.prototype, 'destroy');
    const { plugin } = createPlugin();

    plugin.createBlockToolAdapter('a' as BlockId, 'paragraph');
    plugin.destroyBlockToolAdapter('a' as BlockId);
    destroy.mockClear();

    plugin.destroy();

    expect(destroy).not.toHaveBeenCalled();

    destroy.mockRestore();
  });

  it('should destroy caret and formatting adapters on destroy', () => {
    const caretDestroy = jest.spyOn(CaretAdapter.prototype, 'destroy');
    const formattingDestroy = jest.spyOn(FormattingAdapter.prototype, 'destroy');
    const { plugin } = createPlugin();

    plugin.destroy();

    expect(caretDestroy).toHaveBeenCalledTimes(1);
    expect(formattingDestroy).toHaveBeenCalledTimes(1);

    caretDestroy.mockRestore();
    formattingDestroy.mockRestore();
  });

  it('should release the ui:before-input listener of block adapters on destroy', () => {
    const { plugin, eventBus } = createPlugin();
    const addEventListener = jest.spyOn(eventBus, 'addEventListener');

    plugin.createBlockToolAdapter('a' as BlockId, 'paragraph');

    const call = addEventListener.mock.calls.find(([type]) => type === 'ui:before-input') as unknown[];
    const options = call[2] as AddEventListenerOptions;

    plugin.destroy();

    expect(options.signal?.aborted).toBe(true);
  });
});
