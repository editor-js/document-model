import type { Index } from '../utils/index.js';
import type { EditorJSModel } from '../EditorJSModel.js';

/**
 * Caret serialized data
 */
export interface CaretSerialized {
  /**
   * Caret id
   */
  readonly id: number;

  /**
   * Caret index
   */
  readonly index: Index | null;
}

/**
 * Caret is responsible for storing caret index
 */
export class Caret {
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
   * EditorJSModel instance
   */
  #model: EditorJSModel;

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
   * @param model - EditorJSModel instance
   * @param index - initial caret index
   */
  constructor(model: EditorJSModel, index: Index | null = null) {
    this.#model = model;

    this.#index = index;
  }

  /**
   * Updates caret index in the model
   *
   * @param index - new caret index
   */
  public update(index: Index): void {
    this.#index = index;

    this.#model.updateCaret(this);
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
