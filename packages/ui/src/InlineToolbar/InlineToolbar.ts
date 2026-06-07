import { make } from '@editorjs/dom';
import { InlineToolbarRenderedUIEvent } from './InlineToolbarRenderedUIEvent.js';
import type {
  CoreConfigValidated,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus,
  InlineToolFacade,
  SelectionChangedCoreEvent
} from '@editorjs/sdk';
import {
  CoreEventType,
  InlineToolOptionKey,
  UiComponentType
} from '@editorjs/sdk';
import type { InlineFragment, TextRange } from '@editorjs/model';
import Style from './InlineToolbar.module.pcss';
import type { PopoverItemDefaultBaseParams, PopoverItemParams } from '@editorjs/ui-kit';
import { PopoverInline, PopoverItemType } from '@editorjs/ui-kit';
import { beautifyShortcut, capitalize } from '@editorjs/helpers';

/**
 * Inline Toolbar UI module
 * - renders the inline toolbar with available inline tools
 * - listens to the selection change core event
 * - handles the inline tools actions via EditorAPI
 */
export class InlineToolbarUI implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.InlineToolbar;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * HTML nodes of the inline toolbar
   */
  #nodes: Record<string, HTMLElement> = {};

  /**
   * EditorAPI instance to apply inline tools
   */
  #api: EditorAPI;

  /**
   * Editor's Config
   */
  #config: CoreConfigValidated;

  /**
   * Popover instance for inline tool buttons
   */
  #popover: PopoverInline | null = null;

  /**
   * InlineToolbarUI class constructor
   * @param params - Plugin parameters
   */
  constructor({
    api,
    eventBus,
    config,
  }: EditorjsPluginParams) {
    this.#eventBus = eventBus;
    this.#api = api;
    this.#config = config;

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.SelectionChanged}`, (event: SelectionChangedCoreEvent) => void this.#handleSelectionChange(event));
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    this.#nodes.holder?.remove();
  }

  /**
   * Handles the selection change core event
   * @param event - SelectionChangedCoreEvent event
   */
  async #handleSelectionChange(event: SelectionChangedCoreEvent): Promise<void> {
    const { availableInlineTools, index, fragments } = event.detail;
    const selection = window.getSelection();
    const segments = index?.getTextSegments() ?? [];
    /**
     * For composite selection the first segment can be collapsed (e.g. range starts at end of block 1);
     * `isActive` should use a non-collapsed local range, not `segments[0]` unconditionally.
     */
    const firstNonCollapsedSegment = segments.find(
      segment =>
        segment.textRange !== undefined
        && segment.textRange[0] !== segment.textRange[1]
    );

    if (
      !index
      || segments.length === 0
      || firstNonCollapsedSegment === undefined
      /**
       * Index could contain textRange for native inputs,
       * so we need to check if there are ranges in the document selection
       */
      || !selection
      || !selection.rangeCount
    ) {
      this.#hide();

      return;
    }

    const textRange = firstNonCollapsedSegment.textRange;

    if (textRange === undefined) {
      this.#hide();

      return;
    }

    await this.#renderPopover(availableInlineTools, textRange, fragments);
    this.#move();
    this.#show();
  }

  /**
   * Renders the Inline Toolbar UI HTML nodes
   */
  #render(): void {
    this.#nodes.holder = make('div', Style['inline-toolbar']);

    this.#eventBus.dispatchEvent(new InlineToolbarRenderedUIEvent({ toolbar: this.#nodes.holder }));
  }

  /**
   * Creates a new InlinePopover instance and adds it to the Editor UI
   * @param availableInlineTools - inline tools to render in the toolbar
   * @param textRange - selected text range
   * @param fragments - inline tool fragments for the selected text range
   */
  async #renderPopover(
    availableInlineTools: InlineToolFacade[],
    textRange: TextRange,
    fragments: InlineFragment[]
  ): Promise<void> {
    if (this.#popover !== null) {
      this.#popover.destroy();
      this.#popover = null;
    }

    const popoverItems = Array.from(availableInlineTools).map(async (tool, i) => {
      const toolFragments = fragments.filter((fragment: InlineFragment) => fragment.tool === tool.name);
      const shortcut = tool.options.shortcut;
      const instance = tool.create();
      const toolbarConfig = await instance.getToolbarConfig(textRange, toolFragments);

      const shortcutBeautified = shortcut !== undefined ? beautifyShortcut(shortcut) : undefined;
      const toolTitle = capitalize(tool.options[InlineToolOptionKey.Title] ?? tool.name);

      const popoverItemParams: PopoverItemDefaultBaseParams = {
        name: tool.name,
        onActivate: () => this.#onToolClick(tool),
        isActive: () => instance.isActive(
          textRange,
          toolFragments
        ),
        hint: {
          title: toolTitle,
          description: shortcutBeautified,
        },
      };

      return [toolbarConfig]
        .flat()
        .map((item): PopoverItemParams[] => {
          switch (item.type) {
            case PopoverItemType.Html:
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- TS doesn't see its as any
              return [{
                ...popoverItemParams,
                ...item,
              }];
            case PopoverItemType.Separator:
              return [{
                type: PopoverItemType.Separator,
              }];

            case PopoverItemType.Default:
            default:
              const items: PopoverItemParams[] = [
                {
                  ...popoverItemParams,
                  ...item,
                  type: PopoverItemType.Default,
                },
              ];

              if ('children' in item && i !== 0) {
                items.unshift({
                  type: PopoverItemType.Separator,
                });
              }

              if ('children' in item && i < availableInlineTools.length - 1) {
                items.push({
                  type: PopoverItemType.Separator,
                });
              }

              return items;
          }
        })
        .flat();
    });

    this.#popover = new PopoverInline({
      items: (await Promise.all(popoverItems)).flat(),
      scopeElement: this.#config.holder,
      closeOnOutsideClick: false,
    });

    this.#nodes.holder.appendChild(this.#popover.getElement());
  }

  /**
   * Shows the Inline Toolbar
   */
  #show(): void {
    this.#popover?.show();
  }

  /**
   * Hides the Inline Toolbar
   */
  #hide(): void {
    this.#popover?.hide();
    this.#popover?.destroy();
  }

  /**
   * Moves the Inline Toolbar to the current selection
   * @todo Think on how it should work for cross-block selection
   */
  #move(): void {
    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    const rect = range.getBoundingClientRect();
    const holderRect = this.#config.holder.getBoundingClientRect();

    const newPosition = {
      /**
       * @todo if holder has paddings, toolbar is shifted to the left. Think on how to resolve this
       */
      x: rect.x - holderRect.x,
      y: rect.y + rect.height - holderRect.top,
    } as const;

    /**
     * @todo add right overflow handling
     */

    this.#nodes.holder.style.top = `${newPosition.y}px`;
    this.#nodes.holder.style.left = `${newPosition.x}px`;
  }

  /**
   * Applies the inline tool to the current selection
   * @param tool - tool to apply
   */
  #onToolClick(tool: InlineToolFacade): void {
    this.#api.selection.applyInlineTool({ tool: tool.name });
  }
}
