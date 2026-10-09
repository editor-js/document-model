import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EditorAPI } from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { ToolbarUI } from './Toolbar.js';
import type { ToolbarRenderedUIEventPayload } from './ToolbarRenderedUIEvent.js';
import { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import { BlockSettingsClosedUIEvent, BlockSettingsOpenedUIEvent, BlockSettingsRenderedUIEvent } from '../BlockSettings/events/index.js';
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
} {
  const eventBus = new EventBus();
  const api = { blocks: {} } as unknown as EditorAPI;

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
 * The button that opens block settings
 * @param holder - the toolbar element
 */
function settingsButton(holder: HTMLElement): HTMLButtonElement {
  const button = actionButtons(holder).find(
    candidate => candidate.getAttribute('aria-label') === messages.blockSettingsButton
  );

  if (button === undefined) {
    throw new Error('the toolbar rendered no settings button');
  }

  return button;
}

/**
 * Reports a block as hovered, which is what the toolbar follows
 * @param eventBus - bus to dispatch on
 * @param index - position of the block
 */
function selectBlock(eventBus: EventBus, index: number): void {
  eventBus.dispatchEvent(new BlockSelectedUIEvent({
    block: document.createElement('div'),
    index,
  }));
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

  describe('settings button', () => {
    it('should request settings for the block the toolbar is following', () => {
      const onOpen = jest.fn();

      instance.eventBus.addEventListener('ui:block-settings:open', onOpen);

      selectBlock(instance.eventBus, 2);
      settingsButton(instance.holder).click();

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({ index: 2 });
    });

    it('should carry an accessible name and advertise the menu it controls', () => {
      const button = settingsButton(instance.holder);

      expect(button.getAttribute('aria-label')).toBe(messages.blockSettingsButton);
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should follow the menu state with aria-expanded', () => {
      const button = settingsButton(instance.holder);

      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({ blockId: 'block-2' as never }));
      expect(button.getAttribute('aria-expanded')).toBe('true');

      instance.eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should hold focus before the menu is asked to open', () => {
      const button = settingsButton(instance.holder);
      let focusedAtDispatch: Element | null = null;

      instance.eventBus.addEventListener('ui:block-settings:open', () => {
        focusedAtDispatch = document.activeElement;
      });

      selectBlock(instance.eventBus, 0);
      button.click();

      expect(focusedAtDispatch).toBe(button);
    });
  });

  describe('mounting the menu', () => {
    it('should mount the announced popover element into its actions area', () => {
      const popover = document.createElement('div');

      popover.dataset.testid = 'block-settings-popover';

      instance.eventBus.dispatchEvent(new BlockSettingsRenderedUIEvent({ blockSettings: popover }));

      expect(instance.holder.querySelector('[role="toolbar"] [data-testid="block-settings-popover"]')).toBe(popover);
    });
  });

  describe('repositioning', () => {
    it('should not move while block settings are open', () => {
      const moveTo = jest.spyOn(instance.plugin, 'moveTo');

      instance.eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({ blockId: 'block-0' as never }));
      selectBlock(instance.eventBus, 1);

      expect(moveTo).not.toHaveBeenCalled();

      instance.eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));
      selectBlock(instance.eventBus, 1);

      expect(moveTo).toHaveBeenCalledTimes(1);
    });
  });

  describe('roving tabindex', () => {
    it('should keep exactly one action button in the tab order', () => {
      const buttons = actionButtons(instance.holder);

      expect(buttons.length).toBeGreaterThan(1);
      expect(buttons.filter(button => button.tabIndex === 0)).toHaveLength(1);
      expect(buttons.filter(button => button.tabIndex === -1)).toHaveLength(buttons.length - 1);
    });

    it('should move the tab stop with the arrow keys', () => {
      const buttons = actionButtons(instance.holder);

      buttons[0].focus();
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      }));

      expect(buttons[1].tabIndex).toBe(0);
      expect(buttons[0].tabIndex).toBe(-1);
    });
  });
});
