import type { BlockTuneName } from '../BlockTune.js';
import type { DataKey } from '../DataKey.js';
import type { DocumentId } from '../indexing.js';
import type { TextRange } from '../Text.js';
import { IndexBase, IndexKind, type IndexFields } from './IndexBase.js';
import { BlockIndex } from './BlockIndex.js';
import { DataIndex } from './DataIndex.js';
import { DocumentIndex } from './DocumentIndex.js';
import { PropertyIndex } from './PropertyIndex.js';
import { TextIndex } from './TextIndex.js';
import { TuneIndex } from './TuneIndex.js';

/**
 * Internal placeholder used during event bubbling.
 * Stores arbitrary field combinations before the full context (blockIndex, documentId) is available.
 * Never exposed to external consumers — EditorDocument converts these to real concrete classes.
 */
export class PartialIndex extends IndexBase {
  readonly #fields: Partial<IndexFields>;

  /**
   * @param fields - partial set of index fields
   */
  constructor(fields: Partial<IndexFields>) {
    super(IndexKind.Document);
    this.#fields = fields;
  }

  /**
   * Text range if set
   */
  public get textRange(): TextRange | undefined {
    return this.#fields.textRange;
  }

  /**
   * Data key if set
   */
  public get dataKey(): DataKey | undefined {
    return this.#fields.dataKey;
  }

  /**
   * Tune name if set
   */
  public get tuneName(): BlockTuneName | undefined {
    return this.#fields.tuneName;
  }

  /**
   * Tune key if set
   */
  public get tuneKey(): string | undefined {
    return this.#fields.tuneKey;
  }

  /**
   * Block index if set
   */
  public get blockIndex(): number | undefined {
    return this.#fields.blockIndex;
  }

  /**
   * Property name if set
   */
  public get propertyName(): string | undefined {
    return this.#fields.propertyName;
  }

  /**
   * Document identifier if set
   */
  public override get documentId(): DocumentId | undefined {
    return this.#fields.documentId;
  }

  /**
   * True when all text index fields are present
   */
  public get isTextIndex(): boolean {
    return this.#fields.blockIndex !== undefined
      && this.#fields.dataKey !== undefined
      && this.#fields.textRange !== undefined;
  }

  /**
   * True when only block index fields are present
   */
  public get isBlockIndex(): boolean {
    return this.#fields.blockIndex !== undefined
      && this.#fields.tuneName === undefined
      && this.#fields.dataKey === undefined
      && this.#fields.textRange === undefined;
  }

  /**
   * True when only data index fields are present
   */
  public get isDataIndex(): boolean {
    return this.#fields.blockIndex !== undefined
      && this.#fields.tuneName === undefined
      && this.#fields.dataKey !== undefined
      && this.#fields.textRange === undefined;
  }

  /**
   * @param blockIndex - updated block position
   */
  public override withBlockIndex(blockIndex: number): PartialIndex {
    return new PartialIndex({
      ...this.#fields,
      blockIndex,
    });
  }

  /**
   * @param textRange - updated character range
   */
  public override withTextRange(textRange: TextRange): PartialIndex {
    return new PartialIndex({
      ...this.#fields,
      textRange,
    });
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): PartialIndex {
    return new PartialIndex({
      ...this.#fields,
      documentId,
    });
  }

  /**
   * Resolves the accumulated fields into a concrete Index instance.
   * Call after all context (blockIndex, documentId) has been added via with* methods.
   */
  public resolve(): IndexBase {
    const {
      textRange,
      dataKey,
      tuneName,
      tuneKey,
      blockIndex,
      propertyName,
      documentId,
      segments,
    } = this.#fields;

    if (segments !== undefined) {
      return new TextIndex(segments);
    }

    if (propertyName !== undefined) {
      if (
        blockIndex !== undefined
        || dataKey !== undefined
        || tuneName !== undefined
        || textRange !== undefined
      ) {
        throw new Error(
          'PropertyIndex cannot be combined with block-related fields'
        );
      }

      return new PropertyIndex(propertyName, documentId);
    }

    if (textRange !== undefined) {
      if (blockIndex === undefined) {
        throw new Error('TextIndex requires blockIndex');
      }
      if (dataKey === undefined) {
        throw new Error('TextIndex requires dataKey');
      }

      return new TextIndex([
        {
          blockIndex,
          dataKey,
          textRange,
          documentId,
        },
      ]);
    }

    if (dataKey !== undefined) {
      if (tuneName !== undefined) {
        throw new Error('DataIndex cannot be combined with tuneName');
      }
      if (blockIndex === undefined) {
        throw new Error('DataIndex requires blockIndex');
      }

      return new DataIndex(blockIndex, dataKey, documentId);
    }

    if (tuneName !== undefined || tuneKey !== undefined) {
      if (blockIndex === undefined) {
        throw new Error('TuneIndex requires blockIndex');
      }
      if (tuneName === undefined || tuneName.length === 0) {
        throw new Error('TuneIndex requires tuneName');
      }
      if (tuneKey === undefined) {
        throw new Error('TuneIndex requires tuneKey');
      }

      return new TuneIndex(blockIndex, tuneName, tuneKey, documentId);
    }

    if (blockIndex !== undefined) {
      return new BlockIndex(blockIndex, documentId);
    }

    if (documentId !== undefined) {
      return new DocumentIndex(documentId);
    }

    throw new Error('Cannot construct an index with no fields set');
  }

  /**
   * Creates a deep copy
   */
  public clone(): PartialIndex {
    return new PartialIndex({ ...this.#fields });
  }

  /**
   * Not supported — partial indices must be resolved before serialization
   */
  public serialize(): string {
    throw new Error(
      'PartialIndex cannot be serialized — ensure EditorDocument converts it to a concrete Index before serializing'
    );
  }
}
