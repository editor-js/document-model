import { make } from '@editorjs/dom';
import type {
  BlockSelectedCoreEvent,
  BlockTune,
  CoreConfigValidated,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus
} from '@editorjs/sdk';
import { CoreEventType, UiComponentType } from '@editorjs/sdk';
import { PopoverDesktop, PopoverEvent } from '@editorjs/ui-kit';
import {
  BlockTunesClosedUIEvent,
  BlockTunesOpenedUIEvent,
  BlockTunesRenderedUIEvent
} from './events/index.js';

/**
 * UI plugin that renders the block settings popover.
 * Mirrors ToolboxUI: dispatches a rendered event so ToolbarUI can append the element,
 * then opens the popover when it receives a ui:block-tunes:open event.
 */
export class BlockTunesUI implements EditorjsPlugin {
  public static readonly type = UiComponentType.BlockTunes;

  #api: EditorAPI;
  #eventBus: EventBus;
  #editorConfig: CoreConfigValidated;

  #popover: PopoverDesktop;

  #nodes: Record<string, HTMLElement> = {};

  /**
   * Names of items currently registered in the popover, used to clear on each selection
   */
  #currentItemNames: string[] = [];

  constructor({ api, eventBus, config }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;
    this.#editorConfig = config;

    this.#popover = new PopoverDesktop({
      scopeElement: this.#editorConfig.holder,
      searchable: false,
      items: [],
    });

    this.#popover.on(PopoverEvent.Closed, () => {
      this.#eventBus.dispatchEvent(new BlockTunesClosedUIEvent({}));
    });

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockSelected}`, (event: BlockSelectedCoreEvent) => {
      this.#rebuildItems(event.detail.availableBlockTunes);
    });

    this.#eventBus.addEventListener('ui:block-tunes:open', () => {
      this.#open();
    });
  }

  public destroy(): void {
    this.#nodes.holder?.remove();
  }

  #open(): void {
    this.#popover.show();
    this.#eventBus.dispatchEvent(new BlockTunesOpenedUIEvent({}));
  }

  /**
   * Clears current popover items and rebuilds from the new tunes map
   * @param tunes - map of tune name to tune instance
   */
  #rebuildItems(tunes: Map<string, BlockTune>): void {
    for (const name of this.#currentItemNames) {
      this.#popover.removeItemByName(name);
    }

    this.#currentItemNames = [];

    tunes.forEach((tune, name) => {
      this.#popover.addItem({
        name,
        title: tune.title,
        icon: tune.icon,
        closeOnActivate: true,
        onActivate: () => {
          tune.activate?.();
        },
      });

      this.#currentItemNames.push(name);
    });
  }

  #render(): void {
    this.#nodes.holder = make('div');
    this.#nodes.holder.appendChild(this.#popover.getElement());

    this.#eventBus.dispatchEvent(new BlockTunesRenderedUIEvent({
      blockTunes: this.#nodes.holder,
    }));
  }
}

export * from './events/index.js';
