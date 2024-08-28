import type { Index } from '../entities/Index/index.js';
import {
  CaretManagerCaretAddedEvent,
  CaretManagerCaretRemovedEvent,
  CaretManagerCaretUpdatedEvent,
  EventBus
} from '../EventBus/index.js';
import { Caret } from './Caret/Caret.js';
import { CaretEvent } from './Caret/types.js';

/**
 * CaretManager is responsible for creating and updating Caret instances
 */
export class CaretManager extends EventBus {
  /**
   * Caret instances registry
   */
  #registry = new Map<number, Caret>();

  /**
   * Returns Caret instance by id
   *
   * @param id - Caret id
   */
  public getCaret(id: number): Caret | undefined {
    return this.#registry.get(id);
  }

  /**
   * Creates a new Caret instance
   *
   * @param [index] - initial caret index
   * @returns {Caret} created Caret instance
   */
  public createCaret(index?: Index): Caret {
    const caret = new Caret(index);

    this.#registry.set(caret.id, caret);

    caret.addEventListener(CaretEvent.Updated, (event) => this.updateCaret(event.detail));

    this.dispatchEvent(new CaretManagerCaretAddedEvent(caret.toJSON()));

    return caret;
  }

  /**
   * Updates caret instance in the registry
   *
   * @param caret - Caret instance to update
   */
  public updateCaret(caret: Caret): void {
    this.#registry.set(caret.id, caret);

    this.dispatchEvent(new CaretManagerCaretUpdatedEvent(caret.toJSON()));
  }

  /**
   * Removes caret from the registry
   *
   * @param caret - Caret instance to remove
   */
  public removeCaret(caret: Caret): void {
    const success = this.#registry.delete(caret.id);

    if (success) {
      this.dispatchEvent(new CaretManagerCaretRemovedEvent(caret.toJSON()));
    }
  }
}
