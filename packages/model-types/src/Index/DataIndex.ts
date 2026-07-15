import type { DataKey } from '../DataKey.js';
import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to a block data key
 */
export class DataIndex extends IndexBase {
  readonly #blockIndex: number;
  readonly #dataKey: DataKey;
  readonly #documentId?: DocumentId;

  /**
   * @param blockIndex - zero-based block position
   * @param dataKey - key identifying block data
   * @param documentId - optional document identifier
   */
  constructor(blockIndex: number, dataKey: DataKey, documentId?: DocumentId) {
    super(IndexKind.Data);
    this.#blockIndex = blockIndex;
    this.#dataKey = dataKey;
    this.#documentId = documentId;
  }

  /**
   * The zero-based position of the indexed block
   */
  public get blockIndex(): number {
    return this.#blockIndex;
  }

  /**
   * The key of the indexed block data property
   */
  public get dataKey(): DataKey {
    return this.#dataKey;
  }

  /**
   * The unique identifier of the indexed document
   */
  public override get documentId(): DocumentId | undefined {
    return this.#documentId;
  }

  /**
   * @param blockIndex - updated block position
   */
  public override withBlockIndex(blockIndex: number): DataIndex {
    return new DataIndex(blockIndex, this.#dataKey, this.#documentId);
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): DataIndex {
    return new DataIndex(this.#blockIndex, this.#dataKey, documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): DataIndex {
    return new DataIndex(this.#blockIndex, this.#dataKey, this.#documentId);
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'data',
      b: this.#blockIndex,
      data: this.#dataKey,
      ...(this.#documentId !== undefined && { id: this.#documentId }),
    });
  }
}
