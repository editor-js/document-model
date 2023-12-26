import type { Index } from '../utils/index.js';
import { CaretUpdatedEvent, EventBus } from '../utils/index.js';
import { Caret } from './Caret.js';
import type { EditorJSModel } from '../EditorJSModel.js';

/**
 * CaretManager is responsible for creating and updating Caret instances
 */
export class CaretManager extends EventBus {
  /**
   * Caret instances registry
   */
  #registry = new Map<number, Caret>();

  /**
   * EditorJSModel instance
   */
  #model: EditorJSModel;

  /**
   * CaretManager constructor
   *
   * @param model - EditorJSModel instance
   */
  constructor(model: EditorJSModel) {
    super();

    this.#model = model;
  }

  /**
   * Creates a new Caret instance
   *
   * @param [index] - initial caret index
   * @returns {Caret} created Caret instance
   */
  public createCaret(index?: Index): Caret {
    const caret = new Caret(this.#model, index);

    this.#registry.set(caret.id, caret);

    this.dispatchEvent(new CaretUpdatedEvent(caret.toJSON()));

    return caret;
  }

  /**
   * Updates caret instance in the registry
   *
   * @param caret - Caret instance to update
   */
  public updateCaret(caret: Caret): void {
    this.#registry.set(caret.id, caret);

    this.dispatchEvent(new CaretUpdatedEvent(caret.toJSON()));
  }
}
