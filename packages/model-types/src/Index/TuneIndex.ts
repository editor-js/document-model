import type { BlockTuneName } from '../BlockTune.js';
import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to a block tune
 */
export class TuneIndex extends IndexBase {
  readonly #blockIndex: number;
  readonly #tuneName: BlockTuneName;
  readonly #tuneKey: string;
  readonly #documentId?: DocumentId;

  /**
   * @param blockIndex - zero-based block position
   * @param tuneName - name of the block tune
   * @param tuneKey - key within the block tune
   * @param documentId - optional document identifier
   */
  constructor(
    blockIndex: number,
    tuneName: BlockTuneName,
    tuneKey: string,
    documentId?: DocumentId
  ) {
    super(IndexKind.Tune);
    this.#blockIndex = blockIndex;
    this.#tuneName = tuneName;
    this.#tuneKey = tuneKey;
    this.#documentId = documentId;
  }

  /**
   * The zero-based position of the indexed block
   */
  public get blockIndex(): number {
    return this.#blockIndex;
  }

  /**
   * The name of the indexed block tune
   */
  public get tuneName(): BlockTuneName {
    return this.#tuneName;
  }

  /**
   * The key within the indexed block tune
   */
  public get tuneKey(): string {
    return this.#tuneKey;
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
  public override withBlockIndex(blockIndex: number): TuneIndex {
    return new TuneIndex(blockIndex, this.#tuneName, this.#tuneKey, this.#documentId);
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): TuneIndex {
    return new TuneIndex(this.#blockIndex, this.#tuneName, this.#tuneKey, documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): TuneIndex {
    return new TuneIndex(
      this.#blockIndex,
      this.#tuneName,
      this.#tuneKey,
      this.#documentId
    );
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'tune',
      b: this.#blockIndex,
      tune: this.#tuneName,
      key: this.#tuneKey,
      ...(this.#documentId !== undefined && { id: this.#documentId }),
    });
  }
}
