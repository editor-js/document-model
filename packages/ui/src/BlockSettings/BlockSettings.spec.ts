import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CoreConfigValidated, EditorAPI } from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { BlockSettingsUI } from './BlockSettings.js';
import { BlockSettingsOpenUIEvent } from './events/index.js';
import type { BlockSettingsRenderedUIEventPayload } from './events/index.js';
import type { BlockSettingsProvider } from './BlockSettings.js';

/**
 * Blocks the fake document is made of
 */
interface StubBlock {
  /** Block id */
  id: string;
  /** Tool name */
  name: string;
}

const defaultBlocks: StubBlock[] = [
  { id: 'block-0',
    name: 'paragraph' },
  { id: 'block-1',
    name: 'paragraph' },
  { id: 'block-2',
    name: 'image' },
];

/**
 * A position no block occupies, so `getIdByIndex` resolves to nothing
 */
const MISSING_BLOCK_INDEX = 99;

/**
 * Lets the queued provider promises settle. Opening is asynchronous because a provider may
 * return a promise, so nothing about the rendered menu can be asserted synchronously
 */
async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Builds a plugin instance over a fake editor
 * @param blocks - blocks the fake document consists of
 */
function setup(blocks: StubBlock[] = defaultBlocks): {
  /** Instance under test */
  plugin: BlockSettingsUI;
  /** Event bus the instance is wired to */
  eventBus: EventBus;
  /** Element the plugin announced via its rendered event */
  element: HTMLElement;
  /** Fake editor API */
  api: EditorAPI;
  /** The mock backing `api.blocks.getIdByIndex` */
  getIdByIndex: jest.Mock<(index: number) => string | undefined>;
} {
  const eventBus = new EventBus();
  const holder = document.createElement('div');

  const getIdByIndex = jest.fn((index: number) => blocks[index]?.id);

  const api = {
    blocks: {
      getIdByIndex,
      getIndexById: jest.fn((id: string) => blocks.findIndex(block => block.id === id)),
    },
    document: {
      /**
       * Read fresh each time, so a test can mutate the block list between opens
       */
      get data() {
        return { blocks };
      },
    },
    plugins: {},
  } as unknown as EditorAPI;

  let element: HTMLElement | undefined;

  /**
   * Captures the element the plugin announces, which is what the toolbar would mount
   * @param event - the plugin's rendered event
   */
  function captureElement(event: CustomEvent): void {
    element = (event.detail as BlockSettingsRenderedUIEventPayload).blockSettings;
  }

  eventBus.addEventListener('ui:block-settings:rendered', captureElement);

  const plugin = new BlockSettingsUI({
    api,
    eventBus,
    /**
     * The plugin reads a single field off the config, so the rest of the validated
     * shape is not worth standing up here
     */
    config: { holder } as unknown as CoreConfigValidated,
  });

  if (element === undefined) {
    throw new Error('BlockSettingsUI did not announce its element');
  }

  holder.appendChild(element);

  return {
    plugin,
    eventBus,
    element,
    api,
    getIdByIndex,
  };
}

/**
 * Titles of the menu items currently rendered, in document order
 * @param element - the plugin's root element
 */
function itemTitles(element: HTMLElement): string[] {
  return [...element.querySelectorAll('[role="menuitem"]')].map(item => item.textContent?.trim() ?? '');
}

/**
 * Number of separators currently rendered
 * @param element - the plugin's root element
 */
function separatorCount(element: HTMLElement): number {
  return element.querySelectorAll('.ce-popover-item-separator').length;
}

/**
 * Asks the plugin to open settings for a block, then lets the providers settle
 * @param eventBus - bus to dispatch on
 * @param index - block position to open settings for
 */
async function open(eventBus: EventBus, index: number): Promise<void> {
  eventBus.dispatchEvent(new BlockSettingsOpenUIEvent({ index }));

  await flush();
}

describe('BlockSettingsUI', () => {
  let instance: ReturnType<typeof setup>;

  beforeEach(() => {
    document.body.innerHTML = '';
    instance = setup();
  });

  describe('plugin contract', () => {
    it('should be named block-settings', () => {
      expect(BlockSettingsUI.name).toBe('block-settings');
    });

    it('should expose register and close as its public API', () => {
      expect(typeof instance.plugin.publicApi.register).toBe('function');
      expect(typeof instance.plugin.publicApi.close).toBe('function');
    });
  });

  describe('opening', () => {
    it('should resolve the target block id from the reported index', async () => {
      const provider = jest.fn<BlockSettingsProvider>(() => undefined);

      instance.plugin.publicApi.register(provider);

      await open(instance.eventBus, 1);

      expect(instance.getIdByIndex).toHaveBeenCalledWith(1);
      expect(provider).toHaveBeenCalledWith(expect.objectContaining({ blockId: 'block-1' }));
    });

    it('should hand providers the block index and tool alongside its id', async () => {
      const provider = jest.fn<BlockSettingsProvider>(() => undefined);

      instance.plugin.publicApi.register(provider);

      await open(instance.eventBus, 2);

      expect(provider).toHaveBeenCalledWith({
        blockId: 'block-2',
        blockIndex: 2,
        tool: 'image',
      });
    });

    it('should call providers again on every open, so items reflect current state', async () => {
      let isActive = false;
      const provider = jest.fn<BlockSettingsProvider>(() => ({
        title: 'Anchor',
        isActive,
        onActivate: () => {},
      }));

      instance.plugin.publicApi.register(provider);

      await open(instance.eventBus, 0);
      expect(provider).toHaveBeenCalledTimes(1);

      instance.plugin.publicApi.close();
      isActive = true;

      await open(instance.eventBus, 0);
      expect(provider).toHaveBeenCalledTimes(2);
      expect(provider.mock.results[1].value).toMatchObject({ isActive: true });
    });

    it('should render the items a provider returns', async () => {
      instance.plugin.publicApi.register(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      expect(itemTitles(instance.element)).toEqual(['Anchor']);
    });

    it('should invoke the handler of an activated item', async () => {
      const onActivate = jest.fn();

      instance.plugin.publicApi.register(() => ({
        title: 'Anchor',
        onActivate,
      }));

      await open(instance.eventBus, 0);
      instance.element.querySelector<HTMLElement>('[role="menuitem"]')?.click();

      expect(onActivate).toHaveBeenCalled();
    });

    it('should accept a provider that returns a promise', async () => {
      instance.plugin.publicApi.register(() => Promise.resolve({
        title: 'Async',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      expect(itemTitles(instance.element)).toEqual(['Async']);
    });
  });

  describe('ordering', () => {
    it('should order contributions by order then registration, separating providers', async () => {
      instance.plugin.publicApi.register(() => ({
        title: 'Last',
        onActivate: () => {},
      }), { order: 1000 });
      instance.plugin.publicApi.register(() => ({
        title: 'First',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      expect(itemTitles(instance.element)).toEqual(['First', 'Last']);
      expect(separatorCount(instance.element)).toBe(1);
    });

    it('should break ties by registration order', async () => {
      instance.plugin.publicApi.register(() => ({
        title: 'Registered first',
        onActivate: () => {},
      }));
      instance.plugin.publicApi.register(() => ({
        title: 'Registered second',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      expect(itemTitles(instance.element)).toEqual(['Registered first', 'Registered second']);
    });

    it('should not emit a separator for a provider that contributes nothing', async () => {
      instance.plugin.publicApi.register(ctx => (ctx.tool === 'image'
        ? undefined
        : {
            title: 'Only for text',
            onActivate: () => {},
          }));
      instance.plugin.publicApi.register(() => ({
        title: 'Always',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 2);

      expect(itemTitles(instance.element)).toEqual(['Always']);
      expect(separatorCount(instance.element)).toBe(0);
    });

    it('should treat an empty array as no contribution', async () => {
      instance.plugin.publicApi.register(() => []);
      instance.plugin.publicApi.register(() => ({
        title: 'Always',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      expect(itemTitles(instance.element)).toEqual(['Always']);
      expect(separatorCount(instance.element)).toBe(0);
    });
  });

  describe('unregistering', () => {
    it('should stop invoking a provider once it is unregistered', async () => {
      const provider = jest.fn<BlockSettingsProvider>(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));

      const unregister = instance.plugin.publicApi.register(provider);

      unregister();

      await open(instance.eventBus, 0);

      expect(provider).not.toHaveBeenCalled();
      expect(itemTitles(instance.element)).toEqual([]);
    });
  });

  describe('events', () => {
    it('should dispatch opened once the menu is populated', async () => {
      const onOpened = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:opened', onOpened);
      instance.plugin.publicApi.register(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 1);

      expect(onOpened).toHaveBeenCalledTimes(1);
      expect((onOpened.mock.calls[0][0] as CustomEvent).detail).toEqual({ blockId: 'block-1' });
    });

    it('should dispatch closed when closed through the public API', async () => {
      const onClosed = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:closed', onClosed);
      instance.plugin.publicApi.register(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);
      instance.plugin.publicApi.close();

      expect(onClosed).toHaveBeenCalledTimes(1);
    });
  });

  describe('nothing to show', () => {
    it('should not open when every provider contributes nothing', async () => {
      const onOpened = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:opened', onOpened);
      instance.plugin.publicApi.register(() => undefined);

      await open(instance.eventBus, 0);

      expect(onOpened).not.toHaveBeenCalled();
      expect(itemTitles(instance.element)).toEqual([]);
    });

    it('should not open when no provider is registered', async () => {
      const onOpened = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:opened', onOpened);

      await open(instance.eventBus, 0);

      expect(onOpened).not.toHaveBeenCalled();
    });

    it('should do nothing when the index resolves to no block', async () => {
      const provider = jest.fn<BlockSettingsProvider>(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));
      const onOpened = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:opened', onOpened);
      instance.plugin.publicApi.register(provider);

      await open(instance.eventBus, MISSING_BLOCK_INDEX);

      expect(provider).not.toHaveBeenCalled();
      expect(onOpened).not.toHaveBeenCalled();
      expect(itemTitles(instance.element)).toEqual([]);
    });
  });

  describe('accessibility', () => {
    it('should name the menu from the message catalogue', async () => {
      instance.plugin.publicApi.register(() => ({
        title: 'Anchor',
        onActivate: () => {},
      }));

      await open(instance.eventBus, 0);

      const menu = instance.element.querySelector('[role="menu"]');

      expect(menu?.getAttribute('aria-label')).toBe('Block settings');
    });

    it('should leave no stale items in the accessibility tree when rebuilt smaller', async () => {
      instance.plugin.publicApi.register(ctx => (ctx.tool === 'image'
        ? {
            title: 'Only one',
            onActivate: () => {},
          }
        : [
            {
              title: 'One',
              onActivate: () => {},
            },
            {
              title: 'Two',
              onActivate: () => {},
            },
          ]));

      await open(instance.eventBus, 0);
      expect(itemTitles(instance.element)).toEqual(['One', 'Two']);

      instance.plugin.publicApi.close();
      await open(instance.eventBus, 2);

      expect(itemTitles(instance.element)).toEqual(['Only one']);
    });
  });
});
