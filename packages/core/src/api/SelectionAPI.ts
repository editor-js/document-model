import 'reflect-metadata';
import { inject, injectable } from 'inversify';

import { SelectionManager } from '../components/SelectionManager.js';
import { Caret, CaretManagerEvents, createInlineToolName, EditorJSModel, EventType } from '@editorjs/model';
import { CoreConfigValidated, InlineToolFormatData } from '@editorjs/sdk';
import { SelectionAPI as SelectionApiInterface } from '@editorjs/sdk';
import { TOKENS } from '../tokens';

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
   * @param toolName - Inline Tool name from the config to apply on the current selection
   * @param data - Inline Tool data to apply to the current selection (eg. link data)
   */
  public applyInlineToolForCurrentSelection(toolName: string, data?: InlineToolFormatData): void {
    this.#selectionManager.applyInlineToolForCurrentSelection(createInlineToolName(toolName), data);
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
