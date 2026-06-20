import 'reflect-metadata';
import { inject, injectable } from 'inversify';

import { SelectionManager } from '../components/SelectionManager.js';
import { Caret, EditorJSModel } from '@editorjs/model';
import { CaretManagerEvents, CoreConfigValidated, createInlineToolName, EventType, SelectionAPI as SelectionApiInterface } from '@editorjs/sdk';
import { TOKENS } from '../tokens.js';

/**
 * Selection API class
 * - provides methods to work with selection
 */
@injectable()
export class SelectionAPI implements SelectionApiInterface {
  #selectionManager: SelectionManager;
  #model: EditorJSModel;
  #config: CoreConfigValidated;

  /**
   * SelectionAPI class constructor
   * @param selectionManager - SelectionManager instance to work with selection and inline formatting
   * @param model - EditorJS model instance
   * @param config - EditorJS validated config
   */
  constructor(
    selectionManager: SelectionManager,
    model: EditorJSModel,
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated
  ) {
    this.#selectionManager = selectionManager;
    this.#model = model;
    this.#config = config;
  }

  /**
   * Applies passed inline tool to the current selection
   * @param params - methods parameters
   * @param params.tool - Inline Tool name from the config to apply on the current selection
   * @param [params.data] - Inline Tool data to apply to the current selection (e.g. link data)
   */
  public applyInlineTool({ tool, data }: Parameters<SelectionApiInterface['applyInlineTool']>[0]): void {
    this.#selectionManager.applyInlineToolForCurrentSelection(createInlineToolName(tool), data);
  }

  /**
   * Registers a callback for CaretManager updates. Returns a cleanup function
   * @param callback - callback for CaretManager updates
   */
  public onCaretUpdate(callback: (event: CaretManagerEvents) => void): () => void {
    this.#model.addEventListener(EventType.CaretManagerUpdated, callback);

    return () => {
      this.#model.removeEventListener(EventType.CaretManagerUpdated, callback);
    };
  }

  /**
   * Creates a new caret for a user
   * @param userId - user id. If not provided, creates for current user
   */
  public createCaret(userId = this.#config.userId): Caret {
    return this.#model.createCaret(userId);
  }

  /**
   * Returns user caret
   * @param userId - user id. If not provided, returns for current user
   */
  public getCaret(userId = this.#config.userId): Caret | undefined {
    return this.#model.getCaret(userId);
  }
}
