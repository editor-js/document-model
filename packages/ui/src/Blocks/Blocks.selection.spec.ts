import { beforeEach, describe, expect, it } from '@jest/globals';
import type { EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';
import { BlockAddedCoreEvent, BlockRemovedCoreEvent, EventBus } from '@editorjs/sdk';
import { BlocksUI } from './Blocks.js';
import type { BlocksHolderRenderedUIEvent, BlockSelectedUIEvent } from './events/index.js';

/** Enough blocks to tell "moved to another one" from "stayed put". */
const THREE_BLOCKS = 3;

/** The smallest document where a second block exists to move to. */
const TWO_BLOCKS = 2;

/**
 * Mounts `BlocksUI` over a bus and gives it `count` blocks, each holding its own text node.
 *
 * The blocks are attached to the document for real: the caret is found by asking which block
 * contains the selection's anchor, and a detached node is in no selection
 * @param count - how many blocks the document starts with
 */
function setup(count: number): {
  /** Event bus the instance is wired to */
  eventBus: EventBus;
  /** Instance under test */
  plugin: BlocksUI;
  /** The text nodes the blocks were given, in document order */
  texts: Text[];
  /** Indexes reported through `ui:blocks:block-selected`, in order */
  selected: number[];
  /** Adds a block at a position, keeping the ids the fake API answers with in step */
  addBlockAt: (index: number) => void;
  /** Removes the block at a position, keeping those ids in step */
  removeBlockAt: (index: number) => void;
} {
  const eventBus = new EventBus();
  const selected: number[] = [];

  /**
   * Ids of the blocks by position, as the model would hold them. Spliced alongside every add and
   * removal, so `getIdByIndex` answers for the document the plugin actually has
   */
  const ids: string[] = [];

  eventBus.addEventListener('ui:blocks:block-selected', (event: BlockSelectedUIEvent) => {
    selected.push(event.detail.index);
  });

  /**
   * Attached as soon as it is announced, and before any block is added: a selection can only
   * be placed in nodes that are in the document
   */
  eventBus.addEventListener('ui:blocks:rendered', (event: BlocksHolderRenderedUIEvent) => {
    document.body.appendChild(event.detail.blocksHolder);
  });

  const plugin = new BlocksUI({
    eventBus,
    api: {
      blocks: {
        getIdByIndex: (index: number) => ids[index],
      },
    } as unknown as EditorAPI,
  } as EditorjsPluginParams);

  const texts: Text[] = [];

  for (let index = 0; index < count; index++) {
    const blockElement = document.createElement('div');
    const text = document.createTextNode(`Block ${index}`);

    blockElement.appendChild(text);
    texts.push(text);

    ids.splice(index, 0, `block-${index}`);

    eventBus.dispatchEvent(new BlockAddedCoreEvent({
      tool: 'paragraph',
      data: {},
      ui: blockElement,
      index,
    }));
  }

  return {
    /**
     * Adds a block at a position, as the core would
     * @param index - where the block appears
     */
    addBlockAt: (index: number): void => {
      const blockElement = document.createElement('div');

      blockElement.appendChild(document.createTextNode('Inserted'));
      ids.splice(index, 0, 'block-inserted');

      eventBus.dispatchEvent(new BlockAddedCoreEvent({ tool: 'paragraph',
        data: {},
        ui: blockElement,
        index }));
    },

    /**
     * Removes the block at a position, as the core would
     * @param index - which block goes
     */
    removeBlockAt: (index: number): void => {
      ids.splice(index, 1);

      eventBus.dispatchEvent(new BlockRemovedCoreEvent({ tool: 'paragraph',
        index }));
    },
    eventBus,
    plugin,
    texts,
    selected,
  };
}

/**
 * Moves the pointer into a block, the way hovering it does
 * @param node - a text node inside the block being entered
 */
function hoverBlock(node: Text): void {
  // BlocksUI wraps what it is given: wrapper > contents > the element handed to it > this text.
  const wrapper = node.parentElement?.parentElement?.parentElement;

  wrapper?.dispatchEvent(new MouseEvent('mouseenter'));
}

/**
 * The wrapper `BlocksUI` built around the element it was handed
 * @param node - a text node inside that element
 */
function wrapperOf(node: Text): HTMLElement {
  // BlocksUI wraps what it is given: wrapper > contents > the element handed to it > this text.
  const wrapper = node.parentElement?.parentElement?.parentElement;

  if (wrapper === null || wrapper === undefined) {
    throw new Error('the block has no wrapper');
  }

  return wrapper;
}

/**
 * Puts the caret in a text node, the way clicking or arrowing into a block does
 * @param node - text node to place the caret in
 */
function putCaretIn(node: Text): void {
  const range = document.createRange();

  range.setStart(node, 0);
  range.collapse(true);

  const selection = document.getSelection();

  selection?.removeAllRanges();
  selection?.addRange(range);

  document.dispatchEvent(new Event('selectionchange'));
}

describe('BlocksUI', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.getSelection()?.removeAllRanges();
  });

  describe('telling other plugins which block is selected', () => {
    it('should answer with nothing before any block has been reported', () => {
      const instance = setup(TWO_BLOCKS);

      expect(instance.plugin.publicApi.getSelectedBlock()).toBeUndefined();
    });

    it('should answer with the reported block and its id', () => {
      const instance = setup(THREE_BLOCKS);

      putCaretIn(instance.texts[1]);

      expect(instance.plugin.publicApi.getSelectedBlock()).toEqual({
        block: wrapperOf(instance.texts[1]),
        id: 'block-1',
      });
    });

    /**
     * The id is read through the position the block holds when asked, so a block added above the
     * reported one does not leave the answer naming whoever took its old slot
     */
    it('should still answer with that block once one is added above it', () => {
      const instance = setup(TWO_BLOCKS);

      putCaretIn(instance.texts[1]);
      instance.addBlockAt(0);

      expect(instance.plugin.publicApi.getSelectedBlock()?.id).toBe('block-1');
    });

    /**
     * The wrapper is still held after its block is removed, so without this the answer would be
     * an element that has left the document
     */
    it('should answer with nothing once the reported block is removed', () => {
      const instance = setup(TWO_BLOCKS);

      putCaretIn(instance.texts[1]);

      instance.removeBlockAt(1);

      expect(instance.plugin.publicApi.getSelectedBlock()).toBeUndefined();
    });
  });

  describe('reporting the selected block', () => {
    it('should report the block the caret moved into', () => {
      const instance = setup(THREE_BLOCKS);

      putCaretIn(instance.texts[2]);

      // Hover was the only source of selection, which left every control acting on "the
      // selected block" doing nothing at all for a user who never moves a pointer.
      expect(instance.selected).toEqual([2]);
    });

    it('should report each block the caret moves between', () => {
      const instance = setup(THREE_BLOCKS);

      putCaretIn(instance.texts[0]);
      putCaretIn(instance.texts[1]);

      expect(instance.selected).toEqual([0, 1]);
    });

    it('should not report the same block twice', () => {
      const instance = setup(TWO_BLOCKS);

      putCaretIn(instance.texts[1]);
      // `selectionchange` fires on every keystroke; only a move to another block is news.
      putCaretIn(instance.texts[1]);

      expect(instance.selected).toEqual([1]);
    });

    /**
     * A position recorded earlier goes stale when a block is removed above it: the next block to
     * land on that number reads as "already reported", and the caret arriving there is announced
     * to nobody
     */
    it('should report a different block that lands on the reported position', () => {
      const instance = setup(THREE_BLOCKS);

      putCaretIn(instance.texts[1]);

      // Removing the block above shifts the caret's block to 0 and the one below it to 1.
      instance.removeBlockAt(0);

      putCaretIn(instance.texts[2]);

      expect(instance.selected).toEqual([1, 1]);
    });

    it('should report the block that takes the position of a removed one', () => {
      const instance = setup(THREE_BLOCKS);

      putCaretIn(instance.texts[1]);

      instance.removeBlockAt(1);

      // Block 2 is block 1 now, and it is where the caret goes once the block under it is gone.
      putCaretIn(instance.texts[2]);

      expect(instance.selected).toEqual([1, 1]);
    });

    /**
     * The selection has not moved, but the block has: inserting above it pushes it down the page,
     * and the toolbar takes its position from this event and from nothing else
     */
    it('should report the caret block again when one is added above it', () => {
      const instance = setup(TWO_BLOCKS);

      putCaretIn(instance.texts[1]);

      instance.addBlockAt(0);

      putCaretIn(instance.texts[1]);

      expect(instance.selected).toEqual([1, 2]);
    });

    it('should report a block the pointer re-enters, even if it was the last one reported', () => {
      const { texts, selected } = setup(TWO_BLOCKS);

      hoverBlock(texts[0]);
      hoverBlock(texts[1]);
      hoverBlock(texts[0]);
      hoverBlock(texts[1]);

      /**
       * Pointer entry is not deduplicated, because `mouseenter` only fires on actually
       * crossing into a block -- there is no repetition to suppress. Suppressing it stranded
       * anything that had ignored the last announcement: the toolbar and the settings menu
       * both ignore selection while the menu is open, so after dismissing a menu opened on
       * another block, coming back to this one told them nothing and they kept acting on it
       */
      expect(selected).toEqual([0, 1, 0, 1]);
    });

    it('should still report a repeated pointer entry after the caret reported the same block', () => {
      const { texts, selected } = setup(TWO_BLOCKS);

      putCaretIn(texts[1]);
      hoverBlock(texts[1]);

      expect(selected).toEqual([1, 1]);
    });

    it('should report nothing for a selection outside every block', () => {
      const instance = setup(TWO_BLOCKS);
      const outside = document.createTextNode('elsewhere');

      document.body.appendChild(outside);

      putCaretIn(outside);

      expect(instance.selected).toEqual([]);
    });

    it('should stop listening once destroyed', () => {
      const instance = setup(TWO_BLOCKS);

      instance.plugin.destroy();

      putCaretIn(instance.texts[1]);

      // The listener is on `document`, which outlives every editor on the page.
      expect(instance.selected).toEqual([]);
    });
  });
});
