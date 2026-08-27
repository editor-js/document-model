import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to an entire document
 */
export class DocumentIndex extends IndexBase {
  readonly #documentId: DocumentId;

  /**
   * @param documentId - unique document identifier
   */
  constructor(documentId: DocumentId) {
    super(IndexKind.Document);
    this.#documentId = documentId;
  }

  /**
   * The unique identifier of the indexed document
   */
  public override get documentId(): DocumentId {
    return this.#documentId;
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): DocumentIndex {
    return new DocumentIndex(documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): DocumentIndex {
    return new DocumentIndex(this.#documentId);
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'doc',
      id: this.#documentId,
    });
  }
}
