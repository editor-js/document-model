import type { Index } from '../utils/index.js';
import { EventBus, EventType } from '../utils/index.js';
import { Caret } from './Caret.js';
import type { EditorJSModel } from '../EditorJSModel.js';

/**
 *
 */
export class CaretManager extends EventBus {
  #registry = new Map<number, Caret>();

  #model: EditorJSModel;

  /**
   *
   * @param model
   */
  constructor(model: EditorJSModel) {
    super();

    this.#model = model;
  }

  /**
   *
   * @param start
   * @param end
   * @param index
   */
  public createCaret(index?: Index): Caret {
    const caret = new Caret(this.#model, index);

    this.#registry.set(caret.id, caret);

    this.dispatchEvent(new CustomEvent(EventType.CaretUpdated, {
      detail: caret,
    }));

    return caret;
  }

  /**
   *
   * @param caret
   */
  public updateCaret(caret: Caret): void {
    this.#registry.set(caret.id, caret);

    this.dispatchEvent(new CustomEvent(EventType.CaretUpdated, {
      detail: caret,
    }));
  }
}
