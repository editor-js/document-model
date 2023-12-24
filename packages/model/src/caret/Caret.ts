import type { Index } from '../utils/index.js';
import type { EditorJSModel } from '../EditorJSModel.js';

interface CaretSerialized {
  readonly id: number;
  readonly index: Index | null;
}

export class Caret {
  #index: Index | null = null;

  #id: number = Math.floor(Math.random() * 1e10);

  #model: EditorJSModel;

  public get index(): Readonly<Index | null> {
    return this.#index;
  }

  public get id(): Readonly<number> {
    return this.#id;
  }

  constructor(model: EditorJSModel, index: Index | null = null) {
    this.#model = model;

    this.#index = index;
  }

  public update(index: Index): void {
    this.#index = index;

    this.#model.updateCaret(this);
  }

  public toJSON(): CaretSerialized {
    return {
      id: this.id,
      index: this.index,
    } as CaretSerialized;
  }
}
