import { make } from '@editorjs/dom';
import type {
  BlockToolFacade,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus,
  EditorAPI,
  ToolLoadedCoreEvent, CoreConfigValidated
} from '@editorjs/sdk';
import {
  CoreEventType,
  UiComponentType
} from '@editorjs/sdk';
import { PopoverDesktop, PopoverEvent } from '@editorjs/ui-kit';
import type { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import { ToolboxRenderedUIEvent, ToolboxClosedUIEvent, ToolboxOpenedUIEvent } from './events/index.js';
import type { ToolboxOptionsEntry } from './ToolboxConfigEntry.js';

/**
 * UI module responsible for rendering the toolbox
 *  - renders tool buttons in the toolbox
 *  - listens to the click event on the tool buttons to insert blocks
 */
export class ToolboxUI implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.Toolbox;

  /**
   * EditorAPI instance to insert blocks
   */
  #api: EditorAPI;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Object with Toolbox HTML nodes
   */
  #nodes: Record<string, HTMLElement> = {};

  /**
   * Editor configuration
   */
  #editorConfig: CoreConfigValidated;

  /**
   * Toolbox popover with the list of Tools
   */
  #popover: PopoverDesktop;

  /**
   * Index of a currently selected block (meaning user's mouse is over the block)
   */
  #selectedBlockIndex = -1;

  /**
   * Indicates if popover is open. We shouldn't change selected block while popover is open
   */
  #isPopoverOpen = false;

  /**
   * ToolboxUI class constructor
   * @param params - Plugin parameters
   */
  constructor({
    api,
    eventBus,
    config,
  }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;
    this.#editorConfig = config;

    /**
     * @todo Support mobile layout
     */
    this.#popover = new PopoverDesktop({
      scopeElement: this.#editorConfig.holder,
      searchable: true,
      items: [],
    });

    this.#popover.on(PopoverEvent.Closed, () => {
      this.#isPopoverOpen = false;

      this.#eventBus.dispatchEvent(new ToolboxClosedUIEvent({}));
    });

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: ToolLoadedCoreEvent) => {
      const { tool } = event.detail;

      if (tool?.isBlock?.() === true) {
        this.addTool(tool);
      }
    });

    this.#eventBus.addEventListener('ui:toolbox:open', () => {
      this.open();
    });

    this.#eventBus.addEventListener('ui:blocks:block-selected', (e: BlockSelectedUIEvent) => {
      if (this.#isPopoverOpen) {
        return;
      }

      this.#selectedBlockIndex = e.detail.index;
    });
  }

  /**
   * Open's Toolbox popover
   */
  public open(): void {
    this.#popover.show();

    this.#isPopoverOpen = true;

    this.#eventBus.dispatchEvent(new ToolboxOpenedUIEvent({}));
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    this.#nodes.holder?.remove();
  }

  /**
   * Adds tool button in the toolbox
   * @param tool - Block tool to add to the toolbox
   */
  public addTool(tool: BlockToolFacade): void {
    const toolbox = (tool.options.toolbox ?? {}) as ToolboxOptionsEntry;

    this.#popover.addItem(
      {
        title: tool.name,
        ...toolbox,
        closeOnActivate: true,
        onActivate: () => {
          void this.#api.blocks.insert(
            tool.name,
            toolbox.data ?? {},
            this.#selectedBlockIndex === -1 ? undefined : this.#selectedBlockIndex + 1,
            true
          );
        },
      }
    );
  }

  /**
   * Renders Toolbox UI and dispatches an events
   */
  #render(): void {
    this.#nodes.holder = make('div');

    this.#nodes.holder.appendChild(this.#popover.getElement());

    this.#eventBus.dispatchEvent(new ToolboxRenderedUIEvent({
      toolbox: this.#nodes.holder,
    }));
  }
}

export * from './events/index.js';
