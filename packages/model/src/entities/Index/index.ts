import type { DocumentIndex, TextRange } from '../../EventBus/index.js';
import type { DataKey } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune/index.js';

/**
 * Class representing index in the document model tree
 */
export class Index {
  /**
   * Text range in the text data property
   */
  public textRange?: TextRange;

  /**
   * Data key in the block node
   */
  public dataKey?: DataKey;

  /**
   * Tune name in the block node
   */
  public tuneName?: BlockTuneName;

  /**
   * Tune key of the tune node
   */
  public tuneKey?: string;

  /**
   * Index of the block node
   */
  public blockIndex?: number;

  /**
   * Document property name
   */
  public propertyName?: string;

  /**
   * Document id
   */
  public documentId?: DocumentIndex;

  /**
   * Cross-input selection: one text index per affected input, in document order
   */
  public compositeSegments?: Index[];

  /**
   * Parse serialized index
   *
   * @param serialized - serialized index
   */
  public static parse(serialized: string): Index {
    const outer = JSON.parse(serialized) as unknown;

    if (typeof outer === 'object' && outer !== null && 'composite' in outer) {
      return Index.parseCompositeIndexFromObject(outer);
    }

    if (typeof outer !== 'string') {
      throw new Error('Invalid serialized index: root must be a JSON string or a composite object');
    }

    const arrayIndex = outer.split(':') as string[];

    const index = new Index();

    for (const value of arrayIndex) {
      const [type, data] = value.split('@');

      switch (type) {
        case 'doc':
          index.documentId = data as DocumentIndex;
          break;
        case 'prop':
          index.propertyName = data;
          break;
        case 'block':
          index.blockIndex = Number(data);
          break;
        case 'tune':
          index.tuneName = data as BlockTuneName;
          break;
        case 'tuneKey':
          index.tuneKey = data;
          break;
        case 'data':
          index.dataKey = data as DataKey;
          break;
        default:
          index.textRange = JSON.parse(type) as TextRange;
          break;
      }
    }

    return index;
  }

  /**
   * Builds a composite index from at least two text indices (cross-input selection).
   *
   * @param segments - text indices for each covered input, in document order
   */
  public static fromCompositeSegments(segments: Index[]): Index {
    const index = new Index();

    index.compositeSegments = segments.map((segment) => segment.clone());
    index.validate();

    return index;
  }

  /**
   * Parses a composite index from the JSON root object (see {@link Index.serialize}).
   *
   * @param outer - value returned by `JSON.parse` for a composite serialized index
   */
  private static parseCompositeIndexFromObject(outer: object): Index {
    const composite = (outer as { composite: unknown }).composite;

    if (!Array.isArray(composite)) {
      throw new Error('Invalid composite index');
    }

    const index = new Index();

    index.compositeSegments = composite.map((segment) => {
      if (typeof segment !== 'string') {
        throw new Error('Invalid composite index: each segment must be a serialized index string');
      }

      return Index.parse(segment);
    });

    index.validate();

    return index;
  }

  /**
   * Returns text segments for this index: either composite segments or a single text index.
   */
  public getTextSegments(): Index[] {
    if (this.compositeSegments !== undefined && this.compositeSegments.length > 0) {
      return this.compositeSegments;
    }

    if (this.isTextIndex) {
      return [ this ];
    }

    return [];
  }

  /**
   * Creates new Index object with copied values
   */
  public clone(): Index {
    const index = new Index();

    index.textRange = this.textRange;
    index.dataKey = this.dataKey;
    index.tuneName = this.tuneName;
    index.tuneKey = this.tuneKey;
    index.blockIndex = this.blockIndex;
    index.propertyName = this.propertyName;
    index.documentId = this.documentId;
    index.compositeSegments = this.compositeSegments?.map((segment) => segment.clone());

    return index;
  }

  /**
   * Serialize index to string
   */
  public serialize(): string {
    if (this.compositeSegments !== undefined && this.compositeSegments.length > 0) {
      return JSON.stringify({
        composite: this.compositeSegments.map((segment) => segment.serialize()),
      });
    }

    const arrayIndex = [
      this.documentId ? `doc@${this.documentId}` : undefined,
      this.propertyName !== undefined ? `prop@${this.propertyName}` : undefined,
      this.blockIndex !== undefined ? `block@${this.blockIndex}` : undefined,
      this.tuneName ? `tune@${this.tuneName}` : undefined,
      this.tuneKey !== undefined ? `tuneKey@${this.tuneKey}` : undefined,
      this.dataKey ? `data@${this.dataKey}` : undefined,
      this.textRange ? JSON.stringify(this.textRange) : undefined,
    ] as const;

    return JSON.stringify(arrayIndex.filter((value) => value !== undefined).join(':'));
  }

  /**
   * Validates index
   */
  public validate(): boolean {
    if (this.compositeSegments !== undefined && this.compositeSegments.length > 0) {
      if (this.compositeSegments.length < 2) {
        throw new Error('Invalid index');
      }

      const hasOtherFields =
        this.textRange !== undefined ||
        this.dataKey !== undefined ||
        this.blockIndex !== undefined ||
        this.tuneName !== undefined ||
        this.tuneKey !== undefined ||
        this.propertyName !== undefined ||
        this.documentId !== undefined;

      if (hasOtherFields) {
        throw new Error('Invalid index');
      }

      for (const segment of this.compositeSegments) {
        segment.validate();

        if (!segment.isTextIndex) {
          throw new Error('Invalid index');
        }
      }

      return true;
    }

    const includesTextRange = !!this.textRange;
    const includesDataKey = !!this.dataKey;
    const includesTuneName = !!this.tuneName;
    const includesTuneKey = this.tuneKey !== undefined;
    const includesBlockIndex = this.blockIndex !== undefined;
    const includesPropertyName = this.propertyName !== undefined;
    const includesDocumentId = !!this.documentId;

    const includesSomethingBlockRelated = includesBlockIndex || includesTuneName || includesTuneKey || includesDataKey || includesTextRange;

    switch (true) {
      case includesTuneName && (includesDataKey || includesTextRange):
      case includesTuneName && !includesTuneKey:
      case includesPropertyName && includesSomethingBlockRelated:
      case includesBlockIndex && includesTextRange && !includesDataKey:
      case includesDocumentId && includesDataKey && !includesBlockIndex:
      case includesDocumentId && includesTuneName && !includesBlockIndex:
      case includesDocumentId && includesTextRange && !includesBlockIndex:
      case includesDocumentId && includesTuneKey && !includesBlockIndex:
        throw new Error('Invalid index');

      default:
        return true;
    }
  }

  /**
   * Returns true if index points to the text data
   */
  public get isTextIndex(): boolean {
    if (this.compositeSegments !== undefined && this.compositeSegments.length > 0) {
      return false;
    }

    return this.blockIndex !== undefined && this.dataKey !== undefined && this.textRange !== undefined;
  }

  /**
   * Returns true if index points to the block node
   */
  public get isBlockIndex(): boolean {
    return this.blockIndex !== undefined && this.tuneName === undefined && this.dataKey === undefined && this.textRange === undefined;
  }

  /**
   * Returns true if index points to the block node data key
   */
  public get isDataIndex(): boolean {
    return this.blockIndex !== undefined && this.tuneName === undefined && this.dataKey !== undefined && this.textRange === undefined;
  }
}
