import type { BlockSelectedCoreEvent, BlockTune, EditorAPI, EditorjsPlugin, EditorjsPluginParams, EventBus } from '@editorjs/sdk';
import { CoreEventType, UiComponentType } from '@editorjs/sdk';
import { make } from '@editorjs/dom';
import { css } from './Toolbar.const.js';
import type { ToolboxRenderedUIEvent } from '../Toolbox/events/index.js';
import { IconPlus } from '@codexteam/icons';
import Style from './Toolbar.module.pcss';
import { ToolbarRenderedUIEvent } from './ToolbarRenderedUIEvent.js';
import type { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import { ToolboxOpenUIEvent } from '../Toolbox/events/index.js';

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
   * Container for block tune action buttons
   */
  tuneButtons: HTMLDivElement;
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
    tuneButtons: make('div', Style[css.tuneButtons]) as HTMLDivElement,
  };

  /**
   * True if Toolbox open. We shouldn't move Toolbar while it's open
   */
  #isToolboxOpen = false;

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

    this.#eventBus.addEventListener(`ui:blocks:block-selected`, (event: BlockSelectedUIEvent) => {
      if (this.#isToolboxOpen) {
        return;
      }

      this.moveTo(event.detail.block);
    });

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockSelected}`, (event: BlockSelectedCoreEvent) => {
      this.#renderTunes(event.detail.availableBlockTunes);
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
   * Creates Toolbar HTML nodes
   */
  #render(): void {
    this.#nodes.holder.appendChild(this.#nodes.actions);
    this.#nodes.actions.appendChild(this.#nodes.plusButton);
    this.#nodes.holder.appendChild(this.#nodes.tuneButtons);

    this.#nodes.plusButton.addEventListener('click', () => {
      this.#openToolbox();
    });

    this.#eventBus.dispatchEvent(new ToolbarRenderedUIEvent({
      toolbar: this.#nodes.holder,
    }));
  }

  /**
   * Renders tune action buttons into the toolbar
   * @param tunes - map of tune name to tune instance
   */
  #renderTunes(tunes: Map<string, BlockTune>): void {
    this.#nodes.tuneButtons.innerHTML = '';

    tunes.forEach((tune) => {
      const element = tune.render();

      if (element instanceof HTMLElement) {
        this.#nodes.tuneButtons.appendChild(element);
      }
    });
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
    });

    this.#eventBus.addEventListener(`ui:toolbox:closed`, () => {
      this.#isToolboxOpen = false;
    });
  }

  /**
   * Dispatches an event to Toolbox plugin to open the toolbox
   */
  #openToolbox(): void {
    this.#eventBus.dispatchEvent(new ToolboxOpenUIEvent('ui:toolbox:open'));
  }
}
