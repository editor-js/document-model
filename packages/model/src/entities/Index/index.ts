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
   * Parse serialized index
   *
   * @param serialized - serialized index
   */
  public static parse(serialized: string): Index {
    const arrayIndex = JSON.parse(serialized) as string[];

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
          index.textRange = JSON.parse(data) as TextRange;
          break;
      }
    }

    return index;
  }

  /**
   * Serialize index to string
   */
  public serialize(): string {
    const arrayIndex = [
      this.documentId ? `doc@${this.documentId}` : undefined,
      this.propertyName !== undefined ? `prop@${this.propertyName}` : undefined,
      this.blockIndex !== undefined ? `block@${this.blockIndex}` : undefined,
      this.tuneName ? `tune@${this.tuneName}` : undefined,
      this.tuneKey !== undefined ? `tuneKey@${this.tuneKey}` : undefined,
      this.dataKey ? `data@${this.dataKey}` : undefined,
      this.textRange ? JSON.stringify(this.textRange) : undefined,
    ] as const;

    return JSON.stringify(arrayIndex.filter((value) => value !== undefined));
  }

  /**
   * Validates index
   */
  public validate(): boolean {
    const includesTextRange = !!this.textRange;
    const includesDataKey = !!this.dataKey;
    const includesTuneName = !!this.tuneName;
    const includesTuneKey = this.tuneKey !== undefined;
    const includesBlockIndex = this.blockIndex !== undefined;
    const includesPropertyName = this.propertyName !== undefined;
    const includesDocumentId = !!this.documentId;

    const includesSomethingBlockRelated = includesBlockIndex || includesTuneName || includesDataKey || includesTextRange;

    switch (true) {
      case includesTuneName && (includesDataKey || includesTextRange):
      case includesTuneName && !includesTuneKey:
      case includesPropertyName && includesSomethingBlockRelated:
      case includesBlockIndex && includesTextRange && !includesDataKey:
      case includesDocumentId && includesDataKey && !includesBlockIndex:
      case includesDocumentId && includesTuneName && !includesBlockIndex:
      case includesDocumentId && includesTextRange && !includesBlockIndex:
        throw new Error('Invalid index');

      default:
        return true;
    }
  }
}