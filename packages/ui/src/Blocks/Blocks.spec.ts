import { beforeEach, describe, expect, it } from '@jest/globals';
import type { EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';
import { BlockAddedCoreEvent, EventBus } from '@editorjs/sdk';
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
} {
  const eventBus = new EventBus();
  const selected: number[] = [];

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
    api: {} as EditorAPI,
  } as EditorjsPluginParams);

  const texts: Text[] = [];

  for (let index = 0; index < count; index++) {
    const blockElement = document.createElement('div');
    const text = document.createTextNode(`Block ${index}`);

    blockElement.appendChild(text);
    texts.push(text);

    eventBus.dispatchEvent(new BlockAddedCoreEvent({
      tool: 'paragraph',
      data: {},
      ui: blockElement,
      index,
    }));
  }

  return {
    eventBus,
    plugin,
    texts,
    selected,
  };
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
