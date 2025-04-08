import { make } from '@editorjs/dom';
import { InlineToolbarRenderedUIEvent } from './InlineToolbarRenderedUIEvent.js';
import { 
  EditorAPI, 
  CoreEventType, 
  EventBus, 
  SelectionChangedCoreEvent, 
  EditorjsPlugin, 
  EditorjsPluginParams } from '@editorjs/core';
import { InlineTool, InlineToolFormatData } from '@editorjs/sdk';
import { InlineFragment, InlineToolName, TextRange } from '@editorjs/model';

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
  public static readonly type = 'inline-toolbar';

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
   * InlineToolbarUI class constructor
   * @param _config - EditorJS validated configuration, not used here
   * @param api - EditorAPI instance to apply inline tools
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor({
    api,
    eventBus
  }: EditorjsPluginParams) {    
    this.#eventBus = eventBus;
    this.#api = api;

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.SelectionChanged}`, (event: SelectionChangedCoreEvent) => this.#handleSelectionChange(event));
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
  #handleSelectionChange(event: SelectionChangedCoreEvent): void {
    const { availableInlineTools, index, fragments } = event.detail;
    const selection = window.getSelection();

    if (
      !index
      || index.textRange === undefined
      || (index.textRange[0] === index.textRange[1])
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

    this.#updateToolsList(availableInlineTools, index.textRange, fragments);
    this.#move();
    this.#show();
  }

  /**
   * Renders the Inline Toolbar UI HTML nodes
   */
  #render(): void {
    this.#nodes.holder = make('div');

    this.#nodes.holder.style.display = 'none';
    this.#nodes.holder.style.position = 'absolute';

    this.#nodes.buttons = make('div');
    this.#nodes.buttons.style.display = 'flex';

    this.#nodes.holder.appendChild(this.#nodes.buttons);

    this.#nodes.actions = make('div');

    this.#nodes.holder.appendChild(this.#nodes.actions);
    
    this.#eventBus.dispatchEvent(new InlineToolbarRenderedUIEvent({ toolbar: this.#nodes.holder }));
  }

  /**
   * Shows the Inline Toolbar
   */
  #show(): void {
    this.#nodes.holder.style.display = 'block';
  }

  /**
   * Hides the Inline Toolbar
   */
  #hide(): void {
    this.#nodes.holder.style.display = 'none';
  }

  /**
   * Moves the Inline Toolbar to the current selection
   */
  #move(): void {
    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    const rect = range.getBoundingClientRect();

    this.#nodes.holder.style.top = `${rect.top}px`;
    this.#nodes.holder.style.left = `${rect.left}px`;
    this.#nodes.holder.style.zIndex = '1000';
  }

  /**
   * Renders the list of available inline tools in the Inline Toolbar
   * @param tools - Inline Tools available for the current selection
   * @param textRange - current selection text range
   * @param fragments - inline fragments for the current selection
   */
  #updateToolsList(tools: Map<InlineToolName, InlineTool>, textRange: TextRange, fragments: InlineFragment[]): void {
    this.#nodes.buttons.innerHTML = '';

    Array.from(tools.entries()).forEach(([name, tool]) => {
      const button = make('button');

      button.textContent = name;

      const isActive = tool.isActive(textRange, fragments.filter((fragment: InlineFragment) => fragment.tool === name));

      if (isActive) {
        button.style.fontWeight = 'bold';
      }

      if (Object.hasOwnProperty.call(tool.constructor.prototype, 'renderActions')) {
        button.addEventListener('click', () => {
          this.#renderToolActions(name, tool);
        });
      } else {
        button.addEventListener('click', () => {
          this.#api.selection.applyInlineToolForCurrentSelection(name);
        });
      }

      this.#nodes.buttons.appendChild(button);
    });
  }

  /**
   * Renders the actions for the inline tool
   * @param name - name of the inline tool to render actions for
   * @param tool - inline tool instance
   */
  #renderToolActions(name: string, tool: InlineTool): void {
    const { element } = tool.renderActions?.((data: InlineToolFormatData) => {
      this.#api.selection.applyInlineToolForCurrentSelection(name, data);
    }) ?? { element: null };

    if (element === null) {
      return;
    }

    this.#nodes.actions.innerHTML = '';

    this.#nodes.actions.appendChild(element);
  }
}
