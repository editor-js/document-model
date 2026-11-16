import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { BlockId, EditorAPI } from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { ToolbarUI } from './Toolbar.js';
import type { ToolbarRenderedUIEventPayload } from './ToolbarRenderedUIEvent.js';
import { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import type { SelectedBlock } from '../Blocks/Blocks.js';
import { BlockSettingsClosedUIEvent, BlockSettingsOpenedUIEvent, BlockSettingsRenderedUIEvent } from '../BlockSettings/events/index.js';
import { ToolboxClosedUIEvent, ToolboxOpenedUIEvent } from '../Toolbox/events/index.js';
import { messages } from '../messages.js';

/**
 * Builds a toolbar over a fake editor and mounts the element it announces
 */
function setup(): {
  /** Instance under test */
  plugin: ToolbarUI;
  /** Event bus the instance is wired to */
  eventBus: EventBus;
  /** Element the instance announced */
  holder: HTMLElement;
  /** Reports a block as selected, as `BlocksUI` does: by event, and through its public API */
  select: (block: HTMLElement, index: number) => void;
} {
  const eventBus = new EventBus();

  /**
   * What the blocks plugin would answer with. Driven only through `select`, so this fake cannot
   * come to disagree with the events the toolbar is given
   */
  let selected: SelectedBlock | undefined;

  const api = {
    blocks: {},
    plugins: {
      blocksUI: {
        getSelectedBlock: () => selected,
      },
    },
  } as unknown as EditorAPI;

  let holder: HTMLElement | undefined;

  /**
   * Captures the element the toolbar announces
   * @param event - the toolbar's rendered event
   */
  function captureHolder(event: CustomEvent): void {
    holder = (event.detail as ToolbarRenderedUIEventPayload).toolbar;
  }

  eventBus.addEventListener('ui:toolbar:rendered', captureHolder);

  const plugin = new ToolbarUI({
    api,
    eventBus,
  } as never);

  if (holder === undefined) {
    throw new Error('ToolbarUI did not announce its element');
  }

  document.body.appendChild(holder);

  return {
    /**
     * Reports a block as selected the way `BlocksUI` does
     * @param block - the block's wrapper element
     * @param index - its position in the document
     */
    select: (block: HTMLElement, index: number): void => {
      selected = { block,
        id: `block-${index}` as BlockId };

      eventBus.dispatchEvent(new BlockSelectedUIEvent({ block,
        index }));
    },
    plugin,
    eventBus,
    holder,
  };
}

/**
 * The toolbar's own action buttons
 * @param holder - the toolbar element
 */
function actionButtons(holder: HTMLElement): HTMLButtonElement[] {
  return [...holder.querySelectorAll<HTMLButtonElement>('[role="toolbar"] > button')];
}

/**
 * Announces a block settings widget the way `BlockSettingsUI` does, so the toolbar mounts it
 * @param eventBus - bus to dispatch on
 * @returns the button and menu element that were announced
 */
function announceBlockSettings(eventBus: EventBus): {
  /** The control that opens the menu */
  button: HTMLButtonElement;
  /** The element the menu renders into */
  menu: HTMLElement;
} {
  const button = document.createElement('button');
  const menu = document.createElement('div');

  button.setAttribute('aria-label', messages.blockSettingsButton);
  menu.dataset.testid = 'block-settings-menu';

  eventBus.dispatchEvent(new BlockSettingsRenderedUIEvent({
    button,
    blockSettings: menu,
  }));

  return {
    button,
    menu,
  };
}

/**
 * Reports a block as hovered, which is what the toolbar follows
 * @param instance - the instance under test
 * @param index - position of the block
 * @returns the block element reported as selected
 */
function selectBlock(instance: ReturnType<typeof setup>, index: number): HTMLElement {
  const block = document.createElement('div');

  instance.select(block, index);

  return block;
}

describe('ToolbarUI', () => {
  let instance: ReturnType<typeof setup>;

  beforeEach(() => {
    document.body.innerHTML = '';
    instance = setup();
  });

  describe('opening the toolbox', () => {
    it('should dispatch the open event with an object payload', () => {
      const onOpen = jest.fn();

      instance.eventBus.addEventListener('ui:toolbox:open', onOpen);

      actionButtons(instance.holder)[0].click();

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({});
    });
  });

  describe('mounting an announced widget', () => {
    it('should mount the announced menu element into its actions area', () => {
      const { menu } = announceBlockSettings(instance.eventBus);

      expect(instance.holder.querySelector('[role="toolbar"] [data-testid="block-settings-menu"]')).toBe(menu);
    });

    it('should mount the announced button as a control of its own', () => {
      const { button } = announceBlockSettings(instance.eventBus);

      // A child of the actions container in its own right, which is what puts it in the
      // roving tabindex -- nested inside the menu element it would be invisible to it.
      expect(actionButtons(instance.holder)).toContain(button);
    });

    it('should keep one tab stop after an announced button joins', () => {
      announceBlockSettings(instance.eventBus);

      const buttons = actionButtons(instance.holder);

      expect(buttons).toHaveLength(2);
      expect(buttons.filter(button => button.tabIndex === 0)).toHaveLength(1);
    });

    it('should let the arrow keys reach an announced button', () => {
      const { button } = announceBlockSettings(instance.eventBus);
      const [plusButton] = actionButtons(instance.holder);

      plusButton.focus();
      plusButton.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      }));

      expect(button.tabIndex).toBe(0);
      expect(plusButton.tabIndex).toBe(-1);
    });
  });

  describe('repositioning', () => {
    it('should not move while block settings are open', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({}));
      selectBlock(instance, 1);

      expect(moveTo).not.toHaveBeenCalled();
    });

    /**
     * Nothing announces that selection again, so dropping it stranded the toolbar beside a block
     * the caret had left -- which is what clicking into another block does, since the caret moves
     * on mousedown while the popover only closes on the click
     */
    it('should make the move it skipped once block settings close', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({}));

      const block = selectBlock(instance, 1);

      instance.eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));

      expect(moveTo).toHaveBeenCalledTimes(1);
      expect(moveTo).toHaveBeenCalledWith(block);
    });

    it('should make the move it skipped once the toolbox closes', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new ToolboxOpenedUIEvent({}));

      const block = selectBlock(instance, 1);

      instance.eventBus.dispatchEvent(new ToolboxClosedUIEvent({}));

      expect(moveTo).toHaveBeenCalledWith(block);
    });

    /**
     * Either popover alone pins the position, so the catch-up waits for both to be gone
     */
    it('should keep holding its position while the other popover is still open', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new ToolboxOpenedUIEvent({}));
      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({}));

      const block = selectBlock(instance, 1);

      instance.eventBus.dispatchEvent(new ToolboxClosedUIEvent({}));

      expect(moveTo).not.toHaveBeenCalled();

      instance.eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));

      expect(moveTo).toHaveBeenCalledWith(block);
    });

    it('should not move when nothing was reported while it was held', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({}));
      instance.eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));

      expect(moveTo).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should stop reacting to block selection', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.plugin.destroy();

      selectBlock(instance, 1);

      // The bus outlives the toolbar, so a listener left on it would keep this instance alive
      // and still moving an element that is no longer on the page.
      expect(moveTo).not.toHaveBeenCalled();
    });

    it('should stop mounting widgets announced afterwards', () => {
      instance.plugin.destroy();

      const { button } = announceBlockSettings(instance.eventBus);

      expect(button.isConnected).toBe(false);
    });

    it('should take its holder off the page', () => {
      instance.plugin.destroy();

      expect(instance.holder.isConnected).toBe(false);
    });
  });

  describe('roving tabindex', () => {
    it('should keep exactly one action button in the tab order', () => {
      announceBlockSettings(instance.eventBus);

      const buttons = actionButtons(instance.holder);

      expect(buttons.length).toBeGreaterThan(1);
      expect(buttons.filter(button => button.tabIndex === 0)).toHaveLength(1);
      expect(buttons.filter(button => button.tabIndex === -1)).toHaveLength(buttons.length - 1);
    });

    it('should wrap around a single control', () => {
      const [plusButton] = actionButtons(instance.holder);

      plusButton.focus();
      plusButton.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      }));

      // With nothing else in the container the move lands back on the same control, which is
      // what keeps a one-control toolbar a no-op rather than an error.
      expect(plusButton.tabIndex).toBe(0);
    });
  });
});
