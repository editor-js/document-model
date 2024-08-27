import type { DocumentIndex, TextRange } from '../../EventBus/index.js';
import type { DataKey } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune/index.js';
import { Index } from './index.js';

/**
 *
 */
export class IndexBuilder {
  #index = new Index();

  /**
   *  Add text range to the index
   *
   * @param range - text range
   */
  public addTextRange(range?: TextRange): this {
    this.#index.textRange = range;

    return this;
  }

  /**
   * Add data key to the index
   *
   * @param key - data key
   */
  public addDataKey(key?: DataKey): this {
    this.#index.dataKey = key;

    return this;
  }

  /**
   * Add tune key to the index
   *
   * @param key - tune key
   */
  public addTuneKey(key?: string): this {
    this.#index.tuneKey = key;

    return this;
  }

  /**
   * Add tune name to the index
   *
   * @param name - tune name
   */
  public addTuneName(name?: BlockTuneName): this {
    this.#index.tuneName = name;

    return this;
  }

  /**
   * Add block index to the index
   *
   * @param index - block index
   */
  public addBlockIndex(index?: number): this {
    this.#index.blockIndex = index;

    return this;
  }

  /**
   * Add property name to the index
   *
   * @param name - property name
   */
  public addPropertyName(name?: string): this {
    this.#index.propertyName = name;

    return this;
  }

  /**
   * Add document id to the index
   *
   * @param id - document id
   */
  public addDocumentId(id?: DocumentIndex): this {
    this.#index.documentId = id;

    return this;
  }

  /**
   * Returns the index object
   */
  public build(): Index {
    this.#index.validate();

    return this.#index;
  }

  /**
   * Set index from serialized index
   *
   * @param json - serialized index
   */
  public from(json: string): this;
  /**
   * Set index from index object
   *
   * @param index - index object
   */
  public from(index: Index): this;
  /**
   * Set index from index object or serialized index
   *
   * @param indexOrJSON - index object or serialized index
   */
  public from(indexOrJSON: Index | string): this {
    if (typeof indexOrJSON === 'string') {
      this.#index = Index.parse(indexOrJSON);

      return this;
    }

    this.#index = indexOrJSON;

    return this;
  }
}
