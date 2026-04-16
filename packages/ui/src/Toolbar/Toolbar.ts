import type { EditorAPI, EditorjsPlugin, EditorjsPluginParams, EventBus } from '@editorjs/sdk';
import { UiComponentType } from '@editorjs/sdk';
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
}

/**
 * Toolbar UI plugin to render HTML toolbar which contains Toolbox and Block Settings popovers
 */
export class ToolbarUI implements EditorjsPlugin {
  public static readonly type = UiComponentType.Toolbar;

  #api: EditorAPI;

  #eventBus: EventBus;

  #nodes: ToolbarNodes = {
    holder: make('div', Style[css.toolbar]) as HTMLDivElement,
    actions: make('div', Style[css.actions]) as HTMLDivElement,
    plusButton: make('button', Style[css.plusButton], {
      innerHTML: IconPlus,
    }) as HTMLButtonElement,
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

    this.#eventBus.addEventListener(`ui:blocks:selected`, (event: BlockSelectedUIEvent) => {
      if (this.#isToolboxOpen) {
        return;
      }

      this.moveTo(event.detail.block);
    });
  }

  /**
   * Moves Toolbar to the provided HTML element
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

    this.#nodes.plusButton.addEventListener('click', () => {
      this.#openToolbox();
    });

    this.#eventBus.dispatchEvent(new ToolbarRenderedUIEvent({
      toolbar: this.#nodes.holder,
    }));
  }

  /**
   * Subscribes to Toolbox events
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
