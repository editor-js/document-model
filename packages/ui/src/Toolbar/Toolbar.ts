import type { EditorAPI, EditorjsPlugin, EditorjsPluginParams, EventBus } from '@editorjs/sdk';
import { UiComponentType } from '@editorjs/sdk';
import { make } from '@editorjs/dom';
import { css } from './Toolbar.const.js';
import type { ToolboxRenderedUIEvent } from '../Toolbox/events/index.js';
import { IconMenuSmall, IconPlus } from '@codexteam/icons';
import Style from './Toolbar.module.pcss';
import { ToolbarRenderedUIEvent } from './ToolbarRenderedUIEvent.js';
import type { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import { ToolboxOpenUIEvent } from '../Toolbox/events/index.js';
import type { BlockSettingsRenderedUIEvent } from '../BlockSettings/events/index.js';
import { BlockSettingsOpenUIEvent } from '../BlockSettings/events/index.js';
import { messages } from '../messages.js';

/**
 * Keys that move between the controls of a horizontal toolbar, mapped to the direction they
 * move in. Deliberately horizontal-only: the actions container lays its buttons out in a row,
 * and ArrowUp/ArrowDown belong to the toolbox popover that opens inside it
 */
const TOOLBAR_STEP_KEYS = new Map<string, number>([
  ['ArrowRight', 1],
  ['ArrowLeft', -1],
]);

/**
 * HTML Nodes toolbar uses in the UI
 */
interface ToolbarNodes {
  /**
   * Toolbar holder element
   */
  holder: HTMLDivElement;

  /**
   * Actions wrapper - contains plus and settings buttons, Toolbox and Block Settings popovers
   */
  actions: HTMLDivElement;

  /**
   * Plus button to open Toolbox popover
   */
  plusButton: HTMLButtonElement;

  /**
   * Settings button to open the Block Settings popover
   */
  settingsButton: HTMLButtonElement;
}

/**
 * Toolbar UI plugin to render HTML toolbar which contains Toolbox and Block Settings popovers
 */
export class ToolbarUI implements EditorjsPlugin {
  public static readonly type = UiComponentType.Toolbar;

  /**
   * Editor.js API
   */
  #api: EditorAPI;

  /**
   * Editor.js EventBus
   */
  #eventBus: EventBus;

  /**
   * Toolbar HTML nodes
   */
  #nodes: ToolbarNodes = {
    holder: make('div', Style[css.toolbar]) as HTMLDivElement,
    actions: make('div', Style[css.actions]) as HTMLDivElement,
    plusButton: make('button', Style[css.plusButton], {
      innerHTML: IconPlus,
    }) as HTMLButtonElement,
    settingsButton: make('button', Style[css.settingsButton], {
      innerHTML: IconMenuSmall,
    }) as HTMLButtonElement,
  };

  /**
   * True if Toolbox open. We shouldn't move Toolbar while it's open
   */
  #isToolboxOpen = false;

  /**
   * True while the Block Settings menu is open. The menu was built for one particular block,
   * so the toolbar has to stay on it until the menu closes
   */
  #isBlockSettingsOpen = false;

  /**
   * Position of the block the toolbar is currently following.
   *
   * `-1` until a block is reported, which is what the settings request carries in that case:
   * it resolves to no block, and `BlockSettingsUI` drops the request
   */
  #selectedBlockIndex = -1;

  /**
   * Constructor function
   * @param args - plugin parameters
   * @param args.api - Editor's API methods
   * @param args.eventBus - Editor's global EventBus to communicate with other plugins
   */
  constructor({
    api,
    eventBus,
  }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;

    this.#render();

    this.#subscribeToToolboxEvents();

    this.#subscribeToBlockSettingsEvents();

    this.#eventBus.addEventListener(`ui:blocks:block-selected`, (event: BlockSelectedUIEvent) => {
      if (this.#isToolboxOpen || this.#isBlockSettingsOpen) {
        return;
      }

      this.#selectedBlockIndex = event.detail.index;

      this.moveTo(event.detail.block);
    });
  }

  /**
   * Moves Toolbar to the provided HTML element
   * @todo - implement a case when several blocks are selected
   * @param block - HTML element to move the Toolbar to
   */
  public moveTo(block: HTMLElement): void {
    this.#nodes.holder.style.top = `${block.offsetTop}px`;
  }

  /**
   * Removes Toolbar's HTML nodes from DOM
   */
  public destroy(): void {
    this.#nodes.holder.remove();
  }

  /**
   * Adds toolbox to the editor UI
   * @param toolboxElement - toolbox HTML element to add to the page
   */
  #addToolbox(toolboxElement: HTMLElement): void {
    this.#nodes.actions.appendChild(toolboxElement);
  }

  /**
   * Adds the Block Settings popover to the editor UI
   * @param blockSettingsElement - block settings HTML element to add to the page
   */
  #addBlockSettings(blockSettingsElement: HTMLElement): void {
    this.#nodes.actions.appendChild(blockSettingsElement);
  }

  /**
   * Creates Toolbar HTML nodes
   */
  #render(): void {
    this.#nodes.holder.appendChild(this.#nodes.actions);
    this.#nodes.actions.appendChild(this.#nodes.plusButton);

    /**
     * Appended before the roving tabindex is initialized below, so that both buttons are
     * already in the container when the single tab stop is assigned
     */
    this.#nodes.actions.appendChild(this.#nodes.settingsButton);

    /**
     * The actions container groups related controls. It is named because the inline toolbar
     * is a toolbar too, and the plus button is icon-only, so it needs a name of its own
     */
    this.#nodes.actions.setAttribute('role', 'toolbar');
    this.#nodes.actions.setAttribute('aria-label', messages.blockActionsToolbar);
    this.#nodes.actions.setAttribute('aria-orientation', 'horizontal');
    this.#nodes.plusButton.setAttribute('aria-label', messages.addBlockButton);
    this.#nodes.settingsButton.setAttribute('aria-label', messages.blockSettingsButton);

    /**
     * role="toolbar" is a promise that the group is a single tab stop navigated with the arrow
     * keys, not a promise the browser keeps on its own. With one control today the roving
     * tabindex is invisible at runtime, but the alternative is a role that describes an
     * interaction the toolbar does not support - and getting it right now is what keeps adding
     * a second control from being the moment it silently becomes wrong
     */
    this.#nodes.actions.addEventListener('keydown', this.#handleActionsKeydown);
    this.#updateRovingTabindex(this.#nodes.plusButton);

    /**
     * The button opens the toolbox, which is rendered as a menu.
     * The expanded state is kept in sync with the toolbox events, see #subscribeToToolboxEvents
     */
    this.#nodes.plusButton.setAttribute('aria-haspopup', 'menu');
    this.#nodes.plusButton.setAttribute('aria-expanded', 'false');

    /**
     * Same menu-button contract as the plus button: it owns the settings menu and reports
     * whether that menu is currently open
     */
    this.#nodes.settingsButton.setAttribute('aria-haspopup', 'menu');
    this.#nodes.settingsButton.setAttribute('aria-expanded', 'false');

    this.#nodes.settingsButton.addEventListener('click', () => {
      /**
       * Focused for the same reason the plus button is: Safari leaves a clicked button
       * unfocused, and the popover would then restore focus to `document.body` on close
       */
      this.#nodes.settingsButton.focus();

      this.#openBlockSettings();
    });

    this.#nodes.plusButton.addEventListener('click', () => {
      /**
       * Safari does not focus a button when it is clicked, so without this the toolbox
       * popover captures `document.body` as the element to restore focus to when it closes -
       * and closing it (by Escape, or by inserting a block) drops focus out of the editor
       * entirely. Focusing the button that owns the menu also matches the WAI-ARIA menu
       * button pattern, where focus returns to the button once the menu is dismissed
       */
      this.#nodes.plusButton.focus();

      this.#openToolbox();
    });

    this.#eventBus.dispatchEvent(new ToolbarRenderedUIEvent({
      toolbar: this.#nodes.holder,
    }));
  }

  /**
   * Subscribes to Toolbox event
   */
  #subscribeToToolboxEvents(): void {
    this.#eventBus.addEventListener(`ui:toolbox:rendered`, (event: ToolboxRenderedUIEvent) => {
      this.#addToolbox(event.detail.toolbox);
    });

    this.#eventBus.addEventListener(`ui:toolbox:opened`, () => {
      this.#isToolboxOpen = true;
      this.#nodes.plusButton.setAttribute('aria-expanded', 'true');
    });

    this.#eventBus.addEventListener(`ui:toolbox:closed`, () => {
      this.#isToolboxOpen = false;
      this.#nodes.plusButton.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Dispatches an event to Toolbox plugin to open the toolbox
   */
  #openToolbox(): void {
    /**
     * The constructor takes a payload, not an event name -- the name is the class's own
     * business. A string satisfied the empty payload type, so this went unnoticed and
     * shipped `detail: 'ui:toolbox:open'` to every listener
     */
    this.#eventBus.dispatchEvent(new ToolboxOpenUIEvent({}));
  }

  /**
   * Subscribes to the Block Settings plugin's events
   */
  #subscribeToBlockSettingsEvents(): void {
    this.#eventBus.addEventListener(`ui:block-settings:rendered`, (event: BlockSettingsRenderedUIEvent) => {
      this.#addBlockSettings(event.detail.blockSettings);
    });

    this.#eventBus.addEventListener(`ui:block-settings:opened`, () => {
      this.#isBlockSettingsOpen = true;
      this.#nodes.settingsButton.setAttribute('aria-expanded', 'true');
    });

    this.#eventBus.addEventListener(`ui:block-settings:closed`, () => {
      this.#isBlockSettingsOpen = false;
      this.#nodes.settingsButton.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Asks the Block Settings plugin to open the menu for the block the toolbar is following
   */
  #openBlockSettings(): void {
    this.#eventBus.dispatchEvent(new BlockSettingsOpenUIEvent({ index: this.#selectedBlockIndex }));
  }

  /**
   * The toolbar's own controls, in the order the arrow keys walk them.
   *
   * Read from the DOM rather than kept as a list, so a control added to the container later is
   * navigable without anything here needing to know about it. Scoped to direct children: the
   * toolbox popover is rendered *inside* this container and its menu items are emphatically not
   * toolbar controls
   * @returns the container's own buttons, in document order
   */
  get #controls(): HTMLElement[] {
    return Array.from(this.#nodes.actions.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'BUTTON'
    );
  }

  /**
   * Makes one control the toolbar's single tab stop and takes the rest out of the tab order,
   * which is what lets Tab move past the toolbar rather than through it
   * @param active - control to leave reachable by Tab
   */
  #updateRovingTabindex(active: HTMLElement): void {
    this.#controls.forEach((control) => {
      control.tabIndex = control === active ? 0 : -1;
    });
  }

  /**
   * Moves focus between the toolbar's controls with the arrow keys, per the WAI-ARIA toolbar
   * pattern, and keeps the tab stop on whichever one was last focused
   * @param event - keydown captured on the actions container
   */
  #handleActionsKeydown = (event: KeyboardEvent): void => {
    /**
     * The toolbar pattern owns the *unmodified* arrow keys and nothing else. A modified arrow
     * always belongs to someone else, and preventDefault()-ing it takes a key away from its
     * real owner: VO+Right and VO+Left - VoiceOver's own cursor navigation - arrive here as
     * Control+Option+Arrow, so without this the toolbar swallows them and a VoiceOver user
     * whose cursor has reached the plus button cannot move off it at all. Cmd+Arrow and
     * Shift+Arrow are the same kind of theft from the OS and from selection
     */
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return;
    }

    const step = TOOLBAR_STEP_KEYS.get(event.key);

    if (step === undefined) {
      return;
    }

    const controls = this.#controls;
    const current = controls.indexOf(event.target as HTMLElement);

    /**
     * Only keys pressed on a control of this toolbar are ours. Anything arriving from inside the
     * toolbox popover is that popover's to handle, and stealing it here would break its own
     * keyboard navigation
     */
    if (current === -1) {
      return;
    }

    /** Wraps, which the pattern calls for and which also makes a single-control toolbar a no-op */
    const next = controls[(current + step + controls.length) % controls.length];

    event.preventDefault();

    this.#updateRovingTabindex(next);
    next.focus();
  };
}
