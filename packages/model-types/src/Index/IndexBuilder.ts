import type { BlockTuneName } from '../BlockTune.js';
import type { DataKey } from '../DataKey.js';
import type { DocumentId } from '../indexing.js';
import type { TextRange } from '../Text.js';
import { Index } from './index.js';

/**
 * Builder for the Index class
 */
export class IndexBuilder {
  #index = new Index();

  /**
   * Sets the character range the index points to within a text data property
   * @param range - start/end offsets of the text range
   */
  public addTextRange(range?: TextRange): this {
    this.#index.textRange = range;

    return this;
  }

  /**
   * Sets the data property the index points to within a block node
   * @param key - identifier of the data property
   */
  public addDataKey(key?: DataKey): this {
    this.#index.dataKey = key;

    return this;
  }

  /**
   * Sets the tune-specific property the index points to
   * @param key - identifier of the tune property
   */
  public addTuneKey(key?: string): this {
    this.#index.tuneKey = key;

    return this;
  }

  /**
   * Sets the block tune the index points to
   * @param name - identifier of the tune
   */
  public addTuneName(name?: BlockTuneName): this {
    this.#index.tuneName = name;

    return this;
  }

  /**
   * Sets the position of the block node the index points to
   * @param index - zero-based position of the block within the document
   */
  public addBlockIndex(index?: number): this {
    this.#index.blockIndex = index;

    return this;
  }

  /**
   * Sets the document-level property the index points to
   * @param name - identifier of the property
   */
  public addPropertyName(name?: string): this {
    this.#index.propertyName = name;

    return this;
  }

  /**
   * Sets the document the index points to
   * @param id - identifier of the document
   */
  public addDocumentId(id?: DocumentId): this {
    this.#index.documentId = id;

    return this;
  }

  /**
   * Validates the accumulated fields and returns the resulting Index
   */
  public build(): Index {
    this.#index.validate();

    return this.#index;
  }

  /**
   * Resets the builder to a previously serialized index
   * @param json - result of Index.serialize()
   */
  public from(json: string): this;
  /**
   * Resets the builder to a copy of an existing index
   * @param index - source index to copy
   */
  public from(index: Index): this;
  /**
   * Resets the builder to a copy of an existing index, or one parsed from its serialized form
   * @param indexOrJSON - source index, or its serialized form
   */
  public from(indexOrJSON: Index | string): this {
    if (typeof indexOrJSON === 'string') {
      this.#index = Index.parse(indexOrJSON);

      return this;
    }

    this.#index = indexOrJSON.clone();

    return this;
  }
}
