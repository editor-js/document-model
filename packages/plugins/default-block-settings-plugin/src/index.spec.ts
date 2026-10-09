import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { BlockSettingsAPI, BlockSettingsContext, BlockSettingsProvider } from '@editorjs/ui';
import type { EditorAPI, EditorjsPluginParams, EventBus } from '@editorjs/sdk';
import { CoreEventType } from '@editorjs/sdk';
import { DefaultBlockSettingsPlugin } from './index.js';

/**
 * Params `api.blocks.move` is called with
 */
interface MoveParams {
  /** Index the block is moved to */
  toIndex: number;
  /** Index the block is moved from */
  fromIndex?: number;
}

/**
 * Params `api.blocks.delete` is called with
 */
interface DeleteParams {
  /** Index or id of the block to remove */
  block?: number | string;
}

/**
 * Order the plugin is expected to register at, so its items sit last
 */
const EXPECTED_ORDER = 1000;

/**
 * A popover item as the plugin returns it, narrowed to what the tests read
 */
interface Item {
  /** Displayed text */
  title?: string;
  /** Machine-readable item name, which reaches the DOM as a data attribute */
  name?: string;
  /** Whether activating the item closes the menu */
  closeOnActivate?: boolean;
  /** Whether the item is greyed out */
  isDisabled?: boolean;
  /** Activation handler, absent on an item with confirmation */
  onActivate?: () => void;
  /** Nested params applied once the item is activated */
  confirmation?: {
    /** Displayed text of the confirmation */
    title?: string;
    /** Machine-readable name of the confirmation item */
    name?: string;
    /** Whether activating the confirmation closes the menu */
    closeOnActivate?: boolean;
    /** Handler that performs the confirmed action */
    onActivate?: () => void;
  };
}

/**
 * Stands up the plugin over a fake editor whose document is a list of block ids
 * @param options - test options
 * @param options.blockIds - ids of the blocks the fake document holds
 * @param options.withBlockSettings - false to omit the block-settings plugin entirely
 */
function setup({ blockIds = ['b0', 'b1', 'b2'], withBlockSettings = true }: {
  /** Ids of the blocks the fake document holds */
  blockIds?: string[];
  /** False to omit the block-settings plugin entirely */
  withBlockSettings?: boolean;
} = {}): {
  /** Instance under test */
    plugin: DefaultBlockSettingsPlugin;
    /** Fires `core:ready`, which is when the plugin registers */
    ready: () => void;
    /** Invokes the registered provider for a block and returns its items */
    itemsFor: (blockId: string) => Promise<Item[]>;
    /** The order the provider was registered with */
    registeredOrder: () => number | undefined;
    /** Spy on `api.blocks.move` */
    move: jest.Mock<(params: MoveParams) => void>;
    /** Spy on `api.blocks.delete` */
    remove: jest.Mock<(params?: DeleteParams) => void>;
    /** Mutable list of block ids, so a test can change the document mid-menu */
    blocks: string[];
  } {
  const blocks = [...blockIds];
  const move = jest.fn<(params: MoveParams) => void>();
  const remove = jest.fn<(params?: DeleteParams) => void>();

  let provider: BlockSettingsProvider | undefined;
  let order: number | undefined;

  const blockSettings: BlockSettingsAPI = {
    register: (registered, options) => {
      provider = registered;
      order = options?.order;

      return () => {
        provider = undefined;
      };
    },
    close: () => {},
  };

  const api = {
    blocks: {
      getIndexById: (id: string) => blocks.indexOf(id),
      move,
      delete: remove,
    },
    document: {
      get data() {
        return { blocks: blocks.map(id => ({ id,
          name: 'paragraph' })) };
      },
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the key is the plugin's `name`, which is kebab-case
    plugins: withBlockSettings ? { 'block-settings': blockSettings } : {},
  } as unknown as EditorAPI;

  const listeners = new Map<string, () => void>();
  const eventBus = {
    addEventListener: (name: string, listener: () => void) => {
      listeners.set(name, listener);
    },
    dispatchEvent: () => true,
  } as unknown as EventBus;

  const plugin = new DefaultBlockSettingsPlugin({
    api,
    eventBus,
  } as EditorjsPluginParams);

  return {
    plugin,
    ready: () => listeners.get(`core:${CoreEventType.Ready}`)?.(),
    registeredOrder: () => order,
    itemsFor: async (blockId: string) => {
      if (provider === undefined) {
        throw new Error('no provider was registered');
      }

      const context: BlockSettingsContext = {
        blockId: blockId as BlockSettingsContext['blockId'],
        blockIndex: blocks.indexOf(blockId),
        tool: 'paragraph',
      };

      const result = await provider(context);

      if (result === undefined) {
        return [];
      }

      return (Array.isArray(result) ? result : [result]) as Item[];
    },
    move,
    remove,
    blocks,
  };
}

/**
 * Finds an item by its title
 * @param items - items to search
 * @param title - title to look for
 */
function byTitle(items: Item[], title: string): Item {
  const item = items.find(candidate => candidate.title === title);

  if (item === undefined) {
    throw new Error(`no item titled ${title}`);
  }

  return item;
}

describe('DefaultBlockSettingsPlugin', () => {
  let instance: ReturnType<typeof setup>;

  beforeEach(() => {
    instance = setup();
  });

  describe('registration', () => {
    it('should be named default-block-settings', () => {
      expect(DefaultBlockSettingsPlugin.name).toBe('default-block-settings');
    });

    it('should give every item a stable name, which reaches the DOM as a data attribute', async () => {
      instance.ready();

      const items = await instance.itemsFor('b1');

      expect(items.map(item => item.name)).toEqual(['move-up', 'move-down', 'delete']);
      expect(byTitle(items, 'Delete').confirmation?.name).toBe('delete-confirm');
    });

    it('should close the menu once an action is taken', async () => {
      instance.ready();

      const items = await instance.itemsFor('b1');

      expect(byTitle(items, 'Move up').closeOnActivate).toBe(true);
      expect(byTitle(items, 'Move down').closeOnActivate).toBe(true);

      /**
       * The delete item itself only reveals its confirmation, so it must *not* close;
       * the confirmation is what closes the menu
       */
      expect(byTitle(items, 'Delete').closeOnActivate).toBeUndefined();
      expect(byTitle(items, 'Delete').confirmation?.closeOnActivate).toBe(true);
    });

    it('should register its provider once the editor is ready', async () => {
      instance.ready();

      const items = await instance.itemsFor('b1');

      expect(items.map(item => item.title)).toEqual(['Move up', 'Move down', 'Delete']);
    });

    it('should register last, so its items follow other providers', () => {
      instance.ready();

      expect(instance.registeredOrder()).toBe(EXPECTED_ORDER);
    });

    it('should not register before the editor is ready', async () => {
      await expect(instance.itemsFor('b1')).rejects.toThrow('no provider was registered');
    });

    it('should stay inert without a block-settings plugin', () => {
      const headless = setup({ withBlockSettings: false });

      expect(() => headless.ready()).not.toThrow();
      expect(() => headless.plugin.destroy()).not.toThrow();
    });

    it('should take its provider back out of the menu when destroyed', async () => {
      instance.ready();
      instance.plugin.destroy();

      await expect(instance.itemsFor('b1')).rejects.toThrow('no provider was registered');
    });
  });

  describe('moving', () => {
    it('should move a block up by one index', async () => {
      instance.ready();

      byTitle(await instance.itemsFor('b1'), 'Move up').onActivate?.();

      expect(instance.move).toHaveBeenCalledWith({
        fromIndex: 1,
        toIndex: 0,
      });
    });

    it('should move a block down by one index', async () => {
      instance.ready();

      byTitle(await instance.itemsFor('b1'), 'Move down').onActivate?.();

      expect(instance.move).toHaveBeenCalledWith({
        fromIndex: 1,
        toIndex: 2,
      });
    });

    it('should disable moving up for the first block', async () => {
      instance.ready();

      const items = await instance.itemsFor('b0');

      expect(byTitle(items, 'Move up').isDisabled).toBe(true);
      expect(byTitle(items, 'Move down').isDisabled).toBe(false);
    });

    it('should disable moving down for the last block', async () => {
      instance.ready();

      const items = await instance.itemsFor('b2');

      expect(byTitle(items, 'Move down').isDisabled).toBe(true);
      expect(byTitle(items, 'Move up').isDisabled).toBe(false);
    });

    it('should resolve the index again at activation, not reuse the one from build time', async () => {
      instance.ready();

      const moveUp = byTitle(await instance.itemsFor('b1'), 'Move up');

      /**
       * A collaborator inserts a block above the target while the menu is open, so `b1`
       * is at index 2 by the time the item is activated
       */
      instance.blocks.unshift('inserted');

      moveUp.onActivate?.();

      expect(instance.move).toHaveBeenCalledWith({
        fromIndex: 2,
        toIndex: 1,
      });
    });

    it('should not move the first block up, even with a stale disabled state', async () => {
      instance.ready();

      /**
       * Built while `b1` sat in the middle, so `isDisabled` is false -- then a collaborator
       * removes the block above it and `b1` becomes first while the menu is still open.
       * The greyed-out state is a snapshot, so the guard in the handler is what has to hold
       */
      const moveUp = byTitle(await instance.itemsFor('b1'), 'Move up');

      instance.blocks.splice(0, 1);

      moveUp.onActivate?.();

      expect(instance.move).not.toHaveBeenCalled();
    });

    it('should not move the last block down, even with a stale disabled state', async () => {
      instance.ready();

      const moveDown = byTitle(await instance.itemsFor('b1'), 'Move down');

      instance.blocks.splice(instance.blocks.indexOf('b2'), 1);

      moveDown.onActivate?.();

      expect(instance.move).not.toHaveBeenCalled();
    });

    it('should do nothing when the target block is gone', async () => {
      instance.ready();

      const items = await instance.itemsFor('b1');

      instance.blocks.splice(instance.blocks.indexOf('b1'), 1);

      expect(() => {
        byTitle(items, 'Move up').onActivate?.();
        byTitle(items, 'Move down').onActivate?.();
      }).not.toThrow();

      expect(instance.move).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('should carry a confirmation instead of a direct handler', async () => {
      instance.ready();

      const remove = byTitle(await instance.itemsFor('b1'), 'Delete');

      expect(remove.onActivate).toBeUndefined();
      expect(remove.confirmation).toBeDefined();
    });

    it('should label the confirmation as the destructive step', async () => {
      instance.ready();

      const remove = byTitle(await instance.itemsFor('b1'), 'Delete');

      /**
       * The item becomes a different control in place -- same element, new title and new
       * action -- so the confirmation needs wording of its own. ui-kit announces this title
       * when the state flips, and an empty one would leave a screen reader user with no
       * indication that the next activation deletes the block
       */
      expect(remove.confirmation?.title).toBe('Click to delete');
    });

    it('should delete by block id once the confirmation is activated', async () => {
      instance.ready();

      byTitle(await instance.itemsFor('b1'), 'Delete').confirmation?.onActivate?.();

      expect(instance.remove).toHaveBeenCalledWith({ block: 'b1' });
    });

    it('should not delete anything until the confirmation is activated', async () => {
      instance.ready();

      await instance.itemsFor('b1');

      expect(instance.remove).not.toHaveBeenCalled();
    });

    it('should do nothing when the target block is gone', async () => {
      instance.ready();

      const remove = byTitle(await instance.itemsFor('b1'), 'Delete');

      instance.blocks.splice(instance.blocks.indexOf('b1'), 1);

      expect(() => remove.confirmation?.onActivate?.()).not.toThrow();
      expect(instance.remove).not.toHaveBeenCalled();
    });
  });
});
