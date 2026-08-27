import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to a document property
 */
export class PropertyIndex extends IndexBase {
  readonly #propertyName: string;
  readonly #documentId?: DocumentId;

  /**
   * @param propertyName - name of the document property
   * @param documentId - optional document identifier
   */
  constructor(propertyName: string, documentId?: DocumentId) {
    super(IndexKind.Property);
    this.#propertyName = propertyName;
    this.#documentId = documentId;
  }

  /**
   * The name of the indexed document property
   */
  public get propertyName(): string {
    return this.#propertyName;
  }

  /**
   * The unique identifier of the indexed document
   */
  public override get documentId(): DocumentId | undefined {
    return this.#documentId;
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): PropertyIndex {
    return new PropertyIndex(this.#propertyName, documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): PropertyIndex {
    return new PropertyIndex(this.#propertyName, this.#documentId);
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'prop',
      name: this.#propertyName,
      ...(this.#documentId !== undefined && { id: this.#documentId }),
    });
  }
}
