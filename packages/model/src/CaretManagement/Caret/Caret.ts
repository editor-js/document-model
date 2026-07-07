import type { Index, CaretSerialized } from '@editorjs/model-types';
import { CaretUpdatedEvent } from './types.js';
import { EventBus } from '@editorjs/model-types';

/**
 * Caret is responsible for storing caret index
 */
export class Caret extends EventBus {
  /**
   * Caret index
   */
  #index: Index | null = null;

  /**
   * User identifier
   */
  #userId: string | number;

  /**
   * Caret index getter
   */
  public get index(): Readonly<Index | null> {
    return this.#index;
  }

  /**
   * Caret id getter
   */
  public get userId(): Readonly<string | number> {
    return this.#userId;
  }

  /**
   * Caret constructor
   * @param userId - user identifier
   * @param index - initial caret index
   */
  constructor(userId: string | number, index: Index | null = null) {
    super();

    this.#userId = userId;
    this.#index = index;
  }

  /**
   * Updates caret index and dispatches updated event
   * @param index - new caret index
   */
  public update(index: Index | null): void {
    this.#index = index;

    this.dispatchEvent(new CaretUpdatedEvent(this));
  }

  /**
   * Serializes caret to JSON
   */
  public toJSON(): CaretSerialized {
    return {
      userId: this.userId,
      index: this.index !== null ? this.index.serialize() : null,
    } as CaretSerialized;
  }
}
