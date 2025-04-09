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
  #registry = new Map<number | string, Caret>();

  /**
   * Returns Caret instance by userId
   *
   * @param userId - identifier of a user who created the caret
   */
  public getCaret(userId: string | number): Caret | undefined {
    return this.#registry.get(userId);
  }

  /**
   * Creates a new Caret instance
   *
   * @param userId - user identifier
   * @param [index] - initial caret index
   * @returns {Caret} created Caret instance
   */
  public createCaret(userId: string | number, index?: Index): Caret {
    const caret = new Caret(userId, index);

    this.#registry.set(caret.userId, caret);

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
    this.#registry.set(caret.userId, caret);

    this.dispatchEvent(new CaretManagerCaretUpdatedEvent(caret.toJSON()));
  }

  /**
   * Removes caret from the registry
   *
   * @param caret - Caret instance to remove
   */
  public removeCaret(caret: Caret): void {
    const success = this.#registry.delete(caret.userId);

    if (success) {
      this.dispatchEvent(new CaretManagerCaretRemovedEvent(caret.toJSON()));
    }
  }
}
