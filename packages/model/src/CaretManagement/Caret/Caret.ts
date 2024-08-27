import type { Index } from '../../entities/Index/index.js';
import type { CaretSerialized, CaretEvent } from './types.js';
import { CaretUpdatedEvent } from './types.js';
import { EventBus } from '../../EventBus/index.js';

/**
 * Interface to extend EventTarget methods
 */
export interface Caret {
  /**
   * Adds CaretEvent listener
   *
   * @param event - type of event
   * @param listener - listener
   */
  addEventListener<K extends CaretUpdatedEvent>(event: CaretEvent, listener: (event: K) => void): void;

  /**
   * Dispatches CaretUpdatedEvent
   *
   * @param event - event to dispatch
   */
  dispatchEvent(event: CaretUpdatedEvent): boolean;
}

/**
 * Caret is responsible for storing caret index
 */
export class Caret extends EventBus {
  /**
   * Caret index
   */
  #index: Index | null = null;

  /**
   * Caret id
   *
   * @todo maybe replace ID generation method
   */
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  #id: number = Math.floor(Math.random() * 1e10);

  /**
   * Caret index getter
   */
  public get index(): Readonly<Index | null> {
    return this.#index;
  }

  /**
   * Caret id getter
   */
  public get id(): Readonly<number> {
    return this.#id;
  }

  /**
   * Caret constructor
   *
   * @param index - initial caret index
   */
  constructor(index: Index | null = null) {
    super();

    this.#index = index;
  }

  /**
   * Updates caret index and dispatches updated event
   *
   * @param index - new caret index
   */
  public update(index: Index): void {
    if (this.#index?.serialize() === index.serialize()) {
      return;
    }

    this.#index = index;

    this.dispatchEvent(new CaretUpdatedEvent(this));
  }

  /**
   * Serializes caret to JSON
   */
  public toJSON(): CaretSerialized {
    return {
      id: this.id,
      index: this.index,
    } as CaretSerialized;
  }
}
