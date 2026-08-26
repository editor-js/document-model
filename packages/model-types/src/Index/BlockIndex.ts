import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to a block
 */
export class BlockIndex extends IndexBase {
  readonly #blockIndex: number;
  readonly #documentId?: DocumentId;

  /**
   * @param blockIndex - zero-based block position
   * @param documentId - optional document identifier
   */
  constructor(blockIndex: number, documentId?: DocumentId) {
    super(IndexKind.Block);

    this.#blockIndex = blockIndex;
    this.#documentId = documentId;
  }

  /**
   * The zero-based position of the indexed block
   */
  public get blockIndex(): number {
    return this.#blockIndex;
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
  public override withBlockIndex(blockIndex: number): BlockIndex {
    return new BlockIndex(blockIndex, this.#documentId);
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): BlockIndex {
    return new BlockIndex(this.#blockIndex, documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): BlockIndex {
    return new BlockIndex(this.#blockIndex, this.#documentId);
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'block',
      b: this.#blockIndex,
      ...(this.#documentId !== undefined && { id: this.#documentId }),
    });
  }
}
