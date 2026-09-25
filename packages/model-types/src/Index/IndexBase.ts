import type { BlockTuneName } from '../BlockTune.js';
import type { DataKey } from '../DataKey.js';
import type { DocumentId } from '../indexing.js';
import type { TextRange } from '../Text.js';

/**
 * Discriminant values identifying what each concrete Index subclass represents
 */
export enum IndexKind {
  /** Root-level document scope */
  Document = 'document',
  /** Document property scope */
  Property = 'property',
  /** Block scope */
  Block = 'block',
  /** Block tune scope */
  Tune = 'tune',
  /** Block data-key scope */
  Data = 'data',
  /** Inline text scope (single or composite) */
  Text = 'text'
}

/**
 * Describes a single text segment within a TextIndex
 */
export interface TextSegment {
  /** Zero-based block index within the document */
  blockIndex: number;
  /** Data key of the block's text property */
  dataKey: DataKey;
  /** Start/end character offsets within the text value */
  textRange: TextRange;
  /** Optional document identifier */
  documentId?: DocumentId;
}

/**
 * Internal bag of optional fields used when building or copying an Index
 */
export interface IndexFields {
  /** Text range within the data property */
  textRange?: TextRange;
  /** Data key within the block */
  dataKey?: DataKey;
  /** Tune name within the block */
  tuneName?: BlockTuneName;
  /** Tune key within the block tune */
  tuneKey?: string;
  /** Block index within the document */
  blockIndex?: number;
  /** Property name within the document */
  propertyName?: string;
  /** Document identifier */
  documentId?: DocumentId;
  /** Complete text segments for multi-segment TextIndex construction */
  segments?: TextSegment[];
}

/**
 * Abstract base class for all document model index types.
 * Use the static factory methods on Index (re-exported from the index barrel) to create instances.
 * Use the `kind` discriminant to narrow to a concrete subclass before accessing type-specific fields.
 */
export abstract class IndexBase {
  /**
   * Discriminant identifying the concrete subclass
   */
  public readonly kind: IndexKind;

  /**
   * @param kind - value identifying the concrete subclass
   */
  protected constructor(kind: IndexKind) {
    this.kind = kind;
  }

  /**
   * Returns a copy of this index with the block index replaced.
   * Override in subclasses that carry a block position.
   * @param _blockIndex - updated block position
   */
  public withBlockIndex(_blockIndex: number): IndexBase {
    throw new Error(`withBlockIndex is not supported for ${this.kind} index`);
  }

  /**
   * Returns a copy of this index with the text range replaced.
   * Override in TextIndex.
   * @param _textRange - updated character range
   */
  public withTextRange(_textRange: TextRange): IndexBase {
    throw new Error(`withTextRange is not supported for ${this.kind} index`);
  }

  /**
   * Returns a copy of this index with the document id replaced.
   * @param _documentId - updated document identifier
   */
  public withDocumentId(_documentId: DocumentId): IndexBase {
    throw new Error(`withDocumentId is not supported for ${this.kind} index`);
  }

  /**
   * Optional document identifier carried by every index type
   */
  public abstract get documentId(): DocumentId | undefined;

  /**
   * Creates a deep copy of this index
   */
  public abstract clone(): IndexBase;

  /**
   * Serializes this index to a JSON string
   */
  public abstract serialize(): string;
}
